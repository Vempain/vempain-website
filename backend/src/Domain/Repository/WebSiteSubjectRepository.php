<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteSubject;

class WebSiteSubjectRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    public function findAll(): array
    {
        return $this->entityManager
            ->getRepository(WebSiteSubject::class)
            ->findAll();
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    public function findByPageId(int $pageId): array
    {
        return $this->findByResource('web_site_page_subject', 'page_id', $pageId);
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    public function findByFileId(int $fileId): array
    {
        return $this->findByResource('web_site_file_subject', 'file_id', $fileId);
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    public function findByGalleryId(int $galleryId): array
    {
        return $this->findByResource('web_site_gallery_subject', 'gallery_id', $galleryId);
    }

    /**
     * @param array<int> $pageIds
     * @return array<int, array<int, WebSiteSubject>>
     */
    public function findByPageIds(array $pageIds): array
    {
        return $this->findByResources('web_site_page_subject', 'page_id', $pageIds);
    }

    /**
     * @param array<int> $galleryIds
     * @return array<int, array<int, WebSiteSubject>>
     */
    public function findByGalleryIds(array $galleryIds): array
    {
        return $this->findByResources('web_site_gallery_subject', 'gallery_id', $galleryIds);
    }

    /**
     * @param array<int> $fileIds
     * @return array<int, array<int, WebSiteSubject>>
     */
    public function findByFileIds(array $fileIds): array
    {
        return $this->findByResources('web_site_file_subject', 'file_id', $fileIds);
    }

    /**
     * @param array<int> $resourceIds
     * @return array<int, WebSiteSubject[]>
     */
    private function findByResources(string $pivotTable, string $pivotColumn, array $resourceIds): array
    {
        $resourceIds = array_values(array_filter(array_map('intval', $resourceIds)));
        if ($resourceIds === []) {
            return [];
        }

        $connection = $this->entityManager->getConnection();
        $sql = sprintf(
            'SELECT %1$s AS resource_id, subject_id FROM %2$s WHERE %1$s IN (:resourceIds)',
            $pivotColumn,
            $pivotTable
        );

        $rows = $connection->executeQuery(
            $sql,
            ['resourceIds' => $resourceIds],
            ['resourceIds' => ArrayParameterType::INTEGER]
        )->fetchAllAssociative();

        if ($rows === []) {
            return [];
        }

        $subjectIds = array_map(static fn(array $row) => (int)$row['subject_id'], $rows);
        $subjectIds = array_values(array_unique($subjectIds));
        if ($subjectIds === []) {
            return [];
        }

        $subjects = $this->entityManager
            ->getRepository(WebSiteSubject::class)
            ->findBy(['id' => $subjectIds], ['subject' => 'ASC']);

        $subjectsById = [];
        foreach ($subjects as $subject) {
            $subjectsById[$subject->getId()] = $subject;
        }

        $grouped = [];
        foreach ($rows as $row) {
            $resourceId = (int)$row['resource_id'];
            $subjectId = (int)$row['subject_id'];
            if (!isset($subjectsById[$subjectId])) {
                continue;
            }

            $grouped[$resourceId] ??= [];
            $grouped[$resourceId][] = $subjectsById[$subjectId];
        }

        foreach ($grouped as &$items) {
            usort(
                $items,
                static function (WebSiteSubject $a, WebSiteSubject $b): int {
                    return strcasecmp($a->getSubject() ?? '', $b->getSubject() ?? '');
                }
            );
        }

        return $grouped;
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    private function findByResource(string $pivotTable, string $pivotColumn, int $resourceId): array
    {
        $result = $this->findByResources($pivotTable, $pivotColumn, [$resourceId]);
        return $result[$resourceId] ?? [];
    }

    /**
     * @param array<int, \Vempain\VempainWebsite\Domain\Entity\WebSitePage> $pages
     */
    public function eagerLoadForPages(array $pages): void
    {
        if ($pages === []) {
            return;
        }

        $pageIds = array_map(static fn($page) => $page->getId(), $pages);
        $subjectsByPage = $this->findByResources('web_site_page_subject', 'page_id', $pageIds);

        foreach ($pages as $page) {
            $pageSubjects = $subjectsByPage[$page->getId()] ?? [];
            $page->setSubjects($pageSubjects);
        }
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    public function autocomplete(string $term, int $limit = 20): array
    {
        $term = trim($term);
        if ($term === '') {
            return [];
        }

        return $this->entityManager
            ->getRepository(WebSiteSubject::class)
            ->createQueryBuilder('s')
            ->where('LOWER(s.subject) LIKE :term')
            ->setParameter('term', '%' . mb_strtolower($term) . '%')
            ->orderBy('s.subject', 'ASC')
            ->setMaxResults(max(1, $limit))
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array<int, array{text:string, value:int}>
     */
    public function findMostUsedTags(int $limit = 100): array
    {
        $limit = max(1, min(1000, $limit));

        $connection = $this->entityManager->getConnection();
        $sql = <<<'SQL'
SELECT tag_counts.tag_text AS text, tag_counts.usage_count AS value
FROM (
    SELECT LOWER(TRIM(s.subject)) AS tag_text, COUNT(*) AS usage_count
    FROM (
        SELECT subject_id FROM web_site_page_subject
        UNION ALL
        SELECT subject_id FROM web_site_file_subject
        UNION ALL
        SELECT subject_id FROM web_site_gallery_subject
    ) refs
    INNER JOIN web_site_subject s ON s.id = refs.subject_id
    WHERE s.subject IS NOT NULL
      AND TRIM(s.subject) <> ''
    GROUP BY LOWER(TRIM(s.subject))
) tag_counts
ORDER BY tag_counts.usage_count DESC, tag_counts.tag_text ASC
LIMIT :limit
SQL;

        $rows = $connection->executeQuery($sql, ['limit' => $limit])->fetchAllAssociative();

        return array_map(
            static fn(array $row): array => [
                'text' => (string)$row['text'],
                'value' => (int)$row['value'],
            ],
            $rows,
        );
    }
}
