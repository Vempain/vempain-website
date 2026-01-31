<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Psr\Log\LoggerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSitePage;

class WebSitePageRepository
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger
    ) {
    }

    public function findAll(): array
    {
        return $this->entityManager
            ->getRepository(WebSitePage::class)
            ->findAll();
    }

    public function findById(int $id): ?WebSitePage
    {
        return $this->entityManager
            ->getRepository(WebSitePage::class)
            ->find($id);
    }

    public function findByFilePath(string $file_path): ?WebSitePage
    {
        return $this->entityManager
            ->getRepository(WebSitePage::class)
            ->findOneBy(['filePath' => $file_path]);
    }

    public function updateCache(WebSitePage $page, string $content): void
    {
        $page->setCache($content);
        $this->entityManager->persist($page);
        $this->entityManager->flush();
    }

    /**
     * @param array<int, array<string, int|string>> $embeds
     */
    public function updateCacheAndEmbeds(WebSitePage $page, string $content, array $embeds): void
    {
        $page->setCache($content);
        $page->setEmbeds($embeds ?: null);
        $this->entityManager->persist($page);
        $this->entityManager->flush();
    }

    public function save(WebSitePage $page): void
    {
        $this->entityManager->persist($page);
        $this->entityManager->flush();
    }

    public function findTopLevelDirectories(): array
    {
        $connection = $this->entityManager->getConnection();
        $sql = <<<'SQL'
SELECT DISTINCT split_part(file_path, '/', 1) AS top_level_directory
FROM web_site_page
WHERE file_path LIKE '%/%'
ORDER BY top_level_directory ASC
SQL;
        $result = $connection->executeQuery($sql)->fetchFirstColumn();
        return array_values(array_filter($result));
    }

    public function findByDirectory(string $directory, int $userId): array
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('p')
            ->from(WebSitePage::class, 'p')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = p.aclId')
            ->andWhere($qb->expr()->orX(
                'a.aclId IS NULL',
                'a.userId = :userId',
                'EXISTS (SELECT 1 FROM web_site_user wsu WHERE wsu.user_id = :userId AND wsu.global_permission = TRUE)'
            ))
            ->setParameter('userId', $userId)
            ->andWhere('p.filePath LIKE :dirPrefix')
            ->orderBy('p.filePath', 'ASC')
            ->setParameter('dirPrefix', $directory . '%');

        return $qb->getQuery()->getResult();
    }

    public function findAccessiblePages(
        int $page,
        int $perPage,
        array $searchTerms,
        string $sortDirection,
        ?string $pathPrefix,
        int $userId
    ): array {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('p')
            ->from(WebSitePage::class, 'p')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = p.aclId')
            ->andWhere($qb->expr()->orX(
                'a.aclId IS NULL',
                'a.userId = :userId',
                'EXISTS (SELECT 1 FROM web_site_user wsu WHERE wsu.user_id = :userId AND wsu.global_permission = TRUE)'
            ))
            ->setParameter('userId', $userId);

        $this->applyFilePathPrefixFilter($qb, $pathPrefix);
        $this->applySearchFilters($qb, $searchTerms);

        $qb
            ->orderBy('p.published', $sortDirection === 'asc' ? 'ASC' : 'DESC')
            ->setFirstResult($page * $perPage)
            ->setMaxResults($perPage);

        return $qb->getQuery()->getResult();
    }

    private function applyFilePathPrefixFilter(QueryBuilder $qb, ?string $filePathPrefix): void
    {
        if ($filePathPrefix === null || $filePathPrefix === '') {
            return;
        }

        $qb
            ->andWhere($qb->expr()->like('p.filePath', ':filePathPrefix'))
            ->setParameter('filePathPrefix', $filePathPrefix . '%');
    }

    private function applySearchFilters(QueryBuilder $qb, array $searchTerms): void
    {
        if ($searchTerms === []) {
            return;
        }

        $expressions = [];
        foreach ($searchTerms as $index => $term) {
            $parameter = sprintf('term_%d', $index);
            $expressions[] = $qb->expr()->orX(
                $qb->expr()->like('LOWER(p.title)', ':' . $parameter),
                $qb->expr()->like('LOWER(p.header)', ':' . $parameter),
                $qb->expr()->andX(
                    $qb->expr()->isNotNull('p.cache'),
                    $qb->expr()->like('LOWER(p.cache)', ':' . $parameter)
                )
            );

            $qb->setParameter($parameter, '%' . mb_strtolower($term) . '%');
        }

        $qb->andWhere(call_user_func_array([$qb->expr(), 'orX'], $expressions));
    }

    public function countPublicPages(array $searchTerms, ?string $pathPrefix, int $userId): int
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('COUNT(p.id)')
            ->from(WebSitePage::class, 'p')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = p.aclId')
            ->andWhere($qb->expr()->orX(
                'a.aclId IS NULL',
                'a.userId = :userId',
                'EXISTS (SELECT 1 FROM web_site_user wsu WHERE wsu.user_id = :userId AND wsu.global_permission = TRUE)'
            ))
            ->setParameter('userId', $userId);

        $this->applyFilePathPrefixFilter($qb, $pathPrefix);
        $this->applySearchFilters($qb, $searchTerms);

        return (int)$qb->getQuery()->getSingleScalarResult();
    }

    public function findByIds(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if ($ids === []) {
            return [];
        }

        return $this->entityManager
            ->getRepository(WebSitePage::class)
            ->findBy(['id' => $ids]);
    }

    public function getEntityManager(): EntityManagerInterface
    {
        return $this->entityManager;
    }
}
