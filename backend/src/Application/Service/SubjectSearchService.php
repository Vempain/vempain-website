<?php

namespace Vempain\VempainWebsite\Application\Service;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\ParameterType;
use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Application\Transformer\LocationTransformer;
use Vempain\VempainWebsite\Application\Transformer\SubjectTransformer;
use Vempain\VempainWebsite\Domain\Repository\WebGpsLocationRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteFileRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteGalleryRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;

class SubjectSearchService
{
    public function __construct(
        private readonly WebSitePageRepository $pageRepository,
        private readonly WebSiteGalleryRepository $galleryRepository,
        private readonly WebSiteFileRepository $fileRepository,
        private readonly WebSiteSubjectRepository $subjectRepository,
        private readonly SubjectTransformer $subjectTransformer,
        private readonly WebGpsLocationRepository $gpsLocationRepository,
        private readonly LocationTransformer $locationTransformer,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function searchBySubject(
        string $search,
        bool $caseSensitive,
        int $page,
        int $size,
        string $sortBy,
        string $direction
    ): array {
        $page = max(0, $page);
        $size = max(1, min(50, $size));
        $direction = strtolower($direction) === 'desc' ? 'desc' : 'asc';
        $sortBy = in_array($sortBy, ['id', 'file_path', 'title', 'shortname'], true) ? $sortBy : 'id';

        $searchTerm = trim($search);
        $like = $caseSensitive ? '%' . $searchTerm . '%' : '%' . mb_strtolower($searchTerm) . '%';

        return [
            'pages' => $this->searchPages($searchTerm, $caseSensitive, $page, $size, $sortBy, $direction, $like),
            'galleries' => $this->searchGalleries($searchTerm, $caseSensitive, $page, $size, $sortBy, $direction, $like),
            'files' => $this->searchFiles($searchTerm, $caseSensitive, $page, $size, $sortBy, $direction, $like),
        ];
    }

    public function searchBySubjectIds(int $userId, array $subjectIds, int $page, int $size, string $sortBy, string $direction): array
    {
        $subjectIds = array_values(array_filter(array_map('intval', $subjectIds)));
        if ($subjectIds === []) {
            return [
                'pages' => $this->emptyPaged($page, $size),
                'galleries' => $this->emptyPaged($page, $size),
                'files' => $this->emptyPaged($page, $size),
            ];
        }

        $page = max(0, $page);
        $size = max(1, min(50, $size));
        $direction = strtolower($direction) === 'desc' ? 'desc' : 'asc';
        $sortBy = in_array($sortBy, ['id', 'file_path', 'title', 'shortname'], true) ? $sortBy : 'id';

        return [
            'pages' => $this->searchPagesBySubjectIds($userId, $subjectIds, $page, $size, $sortBy, $direction),
            'galleries' => $this->searchGalleriesBySubjectIds($userId, $subjectIds, $page, $size, $sortBy, $direction),
            'files' => $this->searchFilesBySubjectIds($userId, $subjectIds, $page, $size, $sortBy, $direction),
        ];
    }

    private function searchPages(string $searchTerm, bool $caseSensitive, int $page, int $size, string $sortBy, string $direction, string $like): array
    {
        $conn = $this->entityManager->getConnection();
        $orderColumn = match ($sortBy) {
            'title' => 'p.title',
            'file_path' => 'p.file_path',
            default => 'p.id',
        };
        $where = $searchTerm === ''
            ? ''
            : ($caseSensitive ? 'WHERE s.subject LIKE :term' : 'WHERE LOWER(s.subject) LIKE :term');

        $countSql = <<<SQL
SELECT COUNT(DISTINCT p.id)
FROM web_site_page p
JOIN web_site_page_subject wps ON wps.page_id = p.id
JOIN web_site_subject s ON s.id = wps.subject_id $where
SQL;
        $stmt = $conn->prepare($countSql);
        if ($searchTerm !== '') {
            $stmt->bindValue('term', $like);
        }
        $total = (int)$stmt->executeQuery()->fetchOne();

        $offset = $page * $size;
        $listSql = <<<SQL
SELECT DISTINCT p.id
FROM web_site_page p
JOIN web_site_page_subject wps ON wps.page_id = p.id
JOIN web_site_subject s ON s.id = wps.subject_id $where
ORDER BY $orderColumn {$direction}
LIMIT :limit OFFSET :offset
SQL;
        $listStmt = $conn->prepare($listSql);
        if ($searchTerm !== '') {
            $listStmt->bindValue('term', $like);
        }
        $listStmt->bindValue('limit', $size);
        $listStmt->bindValue('offset', $offset);
        $pageIds = array_map('intval', $listStmt->executeQuery()->fetchFirstColumn());

        $entities = $this->pageRepository->findByIds($pageIds);
        $subjectsByPage = $this->subjectRepository->findByPageIds($pageIds);
        foreach ($entities as $entity) {
            $entity->setSubjects($subjectsByPage[$entity->getId()] ?? []);
        }

        $content = array_map(function ($pageEntity) {
            return [
                'id' => $pageEntity->getId(),
                'pageId' => $pageEntity->getPageId(),
                'title' => $pageEntity->getTitle(),
                'header' => $pageEntity->getHeader(),
                'file_path' => $pageEntity->getFilePath(),
                'secure' => $pageEntity->isSecure(),
                'aclId' => $pageEntity->getAclId(),
                'published' => $pageEntity->getPublished()?->format('c'),
                'embeds' => $pageEntity->getEmbeds(),
                'subjects' => $this->subjectTransformer->manyFromEntities($pageEntity->getSubjects()),
            ];
        }, $entities);

        $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
        return [
            'content' => $content,
            'page' => $page,
            'size' => $size,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function searchGalleries(string $searchTerm, bool $caseSensitive, int $page, int $size, string $sortBy, string $direction, string $like): array
    {
        $conn = $this->entityManager->getConnection();
        $orderColumn = match ($sortBy) {
            'shortname' => 'g.shortname',
            default => 'g.id',
        };
        $where = $searchTerm === ''
            ? ''
            : ($caseSensitive ? 'WHERE s.subject LIKE :term' : 'WHERE LOWER(s.subject) LIKE :term');

        $countSql = <<<SQL
SELECT COUNT(DISTINCT g.id)
FROM web_site_gallery g
JOIN web_site_gallery_subject wgs ON wgs.gallery_id = g.id
JOIN web_site_subject s ON s.id = wgs.subject_id $where
SQL;
        $stmt = $conn->prepare($countSql);
        if ($searchTerm !== '') {
            $stmt->bindValue('term', $like);
        }
        $total = (int)$stmt->executeQuery()->fetchOne();

        $offset = $page * $size;
        $listSql = <<<SQL
SELECT DISTINCT g.id
FROM web_site_gallery g
JOIN web_site_gallery_subject wgs ON wgs.gallery_id = g.id
JOIN web_site_subject s ON s.id = wgs.subject_id $where
ORDER BY $orderColumn {$direction}
LIMIT :limit OFFSET :offset
SQL;
        $listStmt = $conn->prepare($listSql);
        if ($searchTerm !== '') {
            $listStmt->bindValue('term', $like);
        }
        $listStmt->bindValue('limit', $size);
        $listStmt->bindValue('offset', $offset);
        $galleryIds = array_map('intval', $listStmt->executeQuery()->fetchFirstColumn());

        $entities = $this->galleryRepository->findByIds($galleryIds);
        $subjectsByGallery = $this->subjectRepository->findByGalleryIds($galleryIds);
        foreach ($entities as $gallery) {
            $gallery->setSubjects($subjectsByGallery[$gallery->getId()] ?? []);
        }

        $content = array_map(function ($gallery) {
            return [
                'id' => $gallery->getId(),
                'galleryId' => $gallery->getGalleryId(),
                'shortname' => $gallery->getShortname(),
                'description' => $gallery->getDescription(),
                'subjects' => $this->subjectTransformer->manyFromEntities($gallery->getSubjects()),
            ];
        }, $entities);

        $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
        return [
            'content' => $content,
            'page' => $page,
            'size' => $size,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function searchFiles(string $searchTerm, bool $caseSensitive, int $page, int $size, string $sortBy, string $direction, string $like): array
    {
        $conn = $this->entityManager->getConnection();
        $orderColumn = match ($sortBy) {
            'file_path' => 'f.file_path',
            default => 'f.id',
        };
        $where = $searchTerm === ''
            ? ''
            : ($caseSensitive ? 'WHERE s.subject LIKE :term' : 'WHERE LOWER(s.subject) LIKE :term');

        $countSql = <<<SQL
SELECT COUNT(DISTINCT f.id)
FROM web_site_file f
JOIN web_site_file_subject wfs ON wfs.file_id = f.id
JOIN web_site_subject s ON s.id = wfs.subject_id $where
SQL;
        $stmt = $conn->prepare($countSql);
        if ($searchTerm !== '') {
            $stmt->bindValue('term', $like);
        }
        $total = (int)$stmt->executeQuery()->fetchOne();

        $offset = $page * $size;
        $listSql = <<<SQL
SELECT DISTINCT f.id
FROM web_site_file f
JOIN web_site_file_subject wfs ON wfs.file_id = f.id
JOIN web_site_subject s ON s.id = wfs.subject_id $where
ORDER BY $orderColumn {$direction} LIMIT :limit OFFSET :offset
SQL;
        $listStmt = $conn->prepare($listSql);
        if ($searchTerm !== '') {
            $listStmt->bindValue('term', $like);
        }
        $listStmt->bindValue('limit', $size);
        $listStmt->bindValue('offset', $offset);
        $fileIds = array_map('intval', $listStmt->executeQuery()->fetchFirstColumn());

        $entities = $this->fileRepository->findByIds($fileIds);
        $subjectsByFile = $this->subjectRepository->findByFileIds($fileIds);
        foreach ($entities as $file) {
            $file->setSubjects($subjectsByFile[$file->getId()] ?? []);
        }

        $content = array_map(function ($file) {
            return [
                'id' => $file->getId(),
                'fileId' => $file->getFileId(),
                'file_path' => $file->getFilePath(),
                'mimetype' => $file->getMimetype(),
                'aclId' => $file->getAclId(),
                'subjects' => $this->subjectTransformer->manyFromEntities($file->getSubjects()),
                'comment' => $file->getComment(),
                'originalDateTime' => $file->getOriginalDateTime()?->format('Y-m-d H:i:s'),
                'rightsHolder' => $file->getRightsHolder(),
                'rightsTerms' => $file->getRightsTerms(),
                'rightsUrl' => $file->getRightsUrl(),
                'creatorName' => $file->getCreatorName(),
                'creatorEmail' => $file->getCreatorEmail(),
                'creatorCountry' => $file->getCreatorCountry(),
                'creatorUrl' => $file->getCreatorUrl(),
                'locationId' => $file->getLocationId(),
                'width' => $file->getWidth(),
                'height' => $file->getHeight(),
                'length' => $file->getLength(),
                'pages' => $file->getPages(),
                'metadata' => $file->getMetadata()
            ];
        }, $entities);

        $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
        return [
            'content' => $content,
            'page' => $page,
            'size' => $size,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function searchPagesBySubjectIds(int $userId, array $subjectIds, int $page, int $size, string $sortBy, string $direction): array
    {
        $conn = $this->entityManager->getConnection();
        $orderColumn = match ($sortBy) {
            'title' => 'p.title',
            'file_path' => 'p.file_path',
            default => 'p.id',
        };

        $countSql = <<<'SQL'
SELECT COUNT(*) FROM (
    SELECT p.id
    FROM web_site_page p
    JOIN web_site_page_subject wps ON wps.page_id = p.id
    LEFT JOIN web_site_acl a
        ON a.acl_id = p.acl_id
    WHERE (a.user_id = :user_id
       OR a.acl_id IS NULL)
      AND wps.subject_id IN (:subject_ids)
    GROUP BY p.id
    HAVING COUNT(DISTINCT wps.subject_id) = :need
) t
SQL;
        $params = ['user_id' => $userId, 'subject_ids' => $subjectIds, 'need' => count($subjectIds)];
        $types = ['user_id' => ParameterType::INTEGER, 'subject_ids' => ArrayParameterType::INTEGER, 'need' => ParameterType::INTEGER];
        $total = (int)$conn->executeQuery($countSql, $params, $types)->fetchOne();

        $offset = $page * $size;
        $listSql = <<<SQL
SELECT p.id
FROM web_site_page p
JOIN web_site_page_subject wps ON wps.page_id = p.id
LEFT JOIN web_site_acl a
    ON a.acl_id = p.acl_id
WHERE (a.user_id = :user_id
   OR a.acl_id IS NULL)
  AND wps.subject_id IN (:subject_ids)
GROUP BY p.id
HAVING COUNT(DISTINCT wps.subject_id) = :need
ORDER BY $orderColumn {$direction}
LIMIT :limit OFFSET :offset
SQL;
        $listParams = $params + [ 'limit' => $size, 'offset' => $offset];
        $listTypes = $types + ['limit' => ParameterType::INTEGER, 'offset' => ParameterType::INTEGER];
        $pageIds = array_map('intval', $conn->executeQuery($listSql, $listParams, $listTypes)->fetchFirstColumn());

        $entities = $this->pageRepository->findByIds($pageIds);
        $subjectsByPage = $this->subjectRepository->findByPageIds($pageIds);
        foreach ($entities as $entity) {
            $entity->setSubjects($subjectsByPage[$entity->getId()] ?? []);
        }

        $content = array_map(function ($pageEntity) {
            return [
                'id' => $pageEntity->getId(),
                'pageId' => $pageEntity->getPageId(),
                'title' => $pageEntity->getTitle(),
                'header' => $pageEntity->getHeader(),
                'file_path' => $pageEntity->getFilePath(),
                'secure' => $pageEntity->isSecure(),
                'aclId' => $pageEntity->getAclId(),
                'published' => $pageEntity->getPublished()?->format('c'),
                'embeds' => $pageEntity->getEmbeds(),
                'subjects' => $this->subjectTransformer->manyFromEntities($pageEntity->getSubjects()),
            ];
        }, $entities);

        $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
        return [
            'content' => $content,
            'page' => $page,
            'size' => $size,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function searchGalleriesBySubjectIds(int $userId, array $subjectIds, int $page, int $size, string $sortBy, string $direction): array
    {
        $conn = $this->entityManager->getConnection();
        $orderColumn = match ($sortBy) {
            'shortname' => 'g.shortname',
            default => 'g.id',
        };

        $countSql = <<<'SQL'
SELECT COUNT(*) FROM (
    SELECT g.id
    FROM web_site_gallery g
    JOIN web_site_gallery_subject wgs ON wgs.gallery_id = g.id
    LEFT JOIN web_site_acl a
        ON a.acl_id = g.acl_id
    WHERE (a.user_id = :user_id
       OR a.acl_id IS NULL)
      AND wgs.subject_id IN (:subject_ids)
    GROUP BY g.id
    HAVING COUNT(DISTINCT wgs.subject_id) = :need
) t
SQL;
        $params = ['user_id' => $userId, 'subject_ids' => $subjectIds, 'need' => count($subjectIds)];
        $types = ['user_id' => ParameterType::INTEGER, 'subject_ids' => ArrayParameterType::INTEGER, 'need' => ParameterType::INTEGER];
        $total = (int)$conn->executeQuery($countSql, $params, $types)->fetchOne();

        $offset = $page * $size;
        $listSql = <<<SQL
SELECT g.id
FROM web_site_gallery g
JOIN web_site_gallery_subject wgs ON wgs.gallery_id = g.id
LEFT JOIN web_site_acl a
    ON a.acl_id = g.acl_id
WHERE (a.user_id = :user_id
   OR a.acl_id IS NULL)
  AND wgs.subject_id IN (:subject_ids)
GROUP BY g.id
HAVING COUNT(DISTINCT wgs.subject_id) = :need
ORDER BY $orderColumn {$direction}
LIMIT :limit OFFSET :offset
SQL;
        $listParams = $params + ['limit' => $size, 'offset' => $offset];
        $listTypes = $types + ['limit' => ParameterType::INTEGER, 'offset' => ParameterType::INTEGER];
        $galleryIds = array_map('intval', $conn->executeQuery($listSql, $listParams, $listTypes)->fetchFirstColumn());

        $entities = $this->galleryRepository->findByIds($galleryIds);
        $subjectsByGallery = $this->subjectRepository->findByGalleryIds($galleryIds);
        foreach ($entities as $gallery) {
            $gallery->setSubjects($subjectsByGallery[$gallery->getId()] ?? []);
        }

        $content = array_map(function ($gallery) {
            return [
                'id' => $gallery->getId(),
                'galleryId' => $gallery->getGalleryId(),
                'shortname' => $gallery->getShortname(),
                'description' => $gallery->getDescription(),
                'subjects' => $this->subjectTransformer->manyFromEntities($gallery->getSubjects()),
            ];
        }, $entities);

        $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
        return [
            'content' => $content,
            'page' => $page,
            'size' => $size,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function searchFilesBySubjectIds(
        int $userId,
        array $subjectIds,
        int $page,
        int $size,
        string $sortBy,
        string $direction
    ): array {
        $conn = $this->entityManager->getConnection();
        $orderColumn = match ($sortBy) {
            'file_path' => 'f.file_path',
            default => 'f.id',
        };

        $countSql = <<<'SQL'
SELECT COUNT(*) FROM (
    SELECT f.id
    FROM web_site_file f
    JOIN web_site_file_subject wfs ON wfs.file_id = f.id
    LEFT JOIN web_site_acl a
        ON a.acl_id = f.acl_id
    WHERE (a.user_id = :user_id
       OR a.acl_id IS NULL)
      AND wfs.subject_id IN (:subject_ids)
    GROUP BY f.id
    HAVING COUNT(DISTINCT wfs.subject_id) = :need
) t
SQL;
        $params = ['user_id' => $userId, 'subject_ids' => $subjectIds, 'need' => count($subjectIds)];
        $types = ['user_id' => ParameterType::INTEGER, 'subject_ids' => ArrayParameterType::INTEGER, 'need' => ParameterType::INTEGER];
        $total = (int)$conn->executeQuery($countSql, $params, $types)->fetchOne();

        $offset = $page * $size;
        $listSql = <<<SQL
SELECT f.id
FROM web_site_file f
JOIN web_site_file_subject wfs ON wfs.file_id = f.id
LEFT JOIN web_site_acl a
    ON a.acl_id = f.acl_id
WHERE (a.user_id = :user_id
   OR a.acl_id IS NULL)
  AND wfs.subject_id IN (:subject_ids)
GROUP BY f.id
HAVING COUNT(DISTINCT wfs.subject_id) = :need
ORDER BY $orderColumn {$direction}
LIMIT :limit OFFSET :offset
SQL;
        $listParams = $params + ['limit' => $size, 'offset' => $offset];
        $listTypes = $types + ['limit' => ParameterType::INTEGER, 'offset' => ParameterType::INTEGER];
        $fileIds = array_map('intval', $conn->executeQuery($listSql, $listParams, $listTypes)->fetchFirstColumn());

        $entities = $this->fileRepository->findByIds($fileIds);
        $subjectsByFile = $this->subjectRepository->findByFileIds($fileIds);
        foreach ($entities as $file) {
            $file->setSubjects($subjectsByFile[$file->getId()] ?? []);
        }

        $content = array_map(function ($file) use ($userId) {
            $location = null;
            if ($userId > 0) {
                $locationId = $file->getLocationId();
                if ($locationId !== null) {
                    $locEntity = $this->gpsLocationRepository->findById((int)$locationId);
                    if ($locEntity !== null) {
                        $location = $this->locationTransformer->fromEntity($locEntity);
                    }
                }
            }

            return [
                'id' => $file->getId(),
                'fileId' => $file->getFileId(),
                'filePath' => $file->getFilePath(),
                'mimetype' => $file->getMimetype(),
                'aclId' => $file->getAclId(),
                'subjects' => $this->subjectTransformer->manyFromEntities($file->getSubjects()),
                'comment' => $file->getComment(),
                'originalDateTime' => $file->getOriginalDateTime()?->format('Y-m-d H:i:s'),
                'rightsHolder' => $file->getRightsHolder(),
                'rightsTerms' => $file->getRightsTerms(),
                'rightsUrl' => $file->getRightsUrl(),
                'creatorName' => $file->getCreatorName(),
                'creatorEmail' => $file->getCreatorEmail(),
                'creatorCountry' => $file->getCreatorCountry(),
                'creatorUrl' => $file->getCreatorUrl(),
                'location' => $location,
                'width' => $file->getWidth(),
                'height' => $file->getHeight(),
                'length' => $file->getLength(),
                'pages' => $file->getPages(),
                'metadata' => $file->getMetadata()
            ];
        }, $entities);

        $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
        return [
            'content' => $content,
            'page' => $page,
            'size' => $size,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function emptyPaged(int $page, int $size): array
    {
        $page = max(0, $page);
        $size = max(1, $size);
        return [
            'content' => [],
            'page' => $page,
            'size' => $size,
            'total_elements' => 0,
            'total_pages' => 0,
            'first' => true,
            'last' => true,
            'empty' => true,
        ];
    }
}
