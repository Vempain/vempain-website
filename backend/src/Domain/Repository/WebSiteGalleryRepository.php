<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\DBAL\Exception;
use Doctrine\DBAL\ParameterType;
use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteGallery;

class WebSiteGalleryRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function findAll(): array
    {
        return $this->entityManager
            ->getRepository(WebSiteGallery::class)
            ->findAll();
    }

    public function findById(int $id): ?WebSiteGallery
    {
        return $this->entityManager
            ->getRepository(WebSiteGallery::class)
            ->find($id);
    }

    /**
     * Fetch files that belong to the gallery identified by the external gallery_id value.
     * @return array<int, array<string,mixed>>
     */
    public function findFilesByGalleryExternalId(int $externalGalleryId): array
    {
        $conn = $this->entityManager->getConnection();
        $sql = sprintf(
            <<<'SQL'
SELECT %s
FROM web_site_gallery g
JOIN web_site_gallery_file gf ON gf.gallery_id = g.id
JOIN web_site_file f ON f.id = gf.file_id
WHERE g.gallery_id = :externalGalleryId
ORDER BY gf.sort_order ASC
SQL,
            self::getGalleryFileSelectColumns()
        );
        $stmt = $conn->executeQuery($sql, ['externalGalleryId' => $externalGalleryId]);
        $rows = $stmt->fetchAllAssociative();
        return array_map([self::class, 'mapGalleryFileRow'], $rows);
    }

    /**
     * Fetch paged files for a gallery with optional ordering and search.
     * @param array<string> $searchTerms
     * @return array{items: array<int, array<string,mixed>>, total:int}
     * @throws Exception
     */
    public function paginateFilesByGalleryExternalId(
        int $userId,
        int $externalGalleryId,
        int $page,
        int $perPage,
        string $orderBy = 'sort_order',
        string $direction = 'asc',
        array $searchTerms = [],
    ): array {
        $page = max(1, $page);
        $perPage = max(1, $perPage);
        $direction = strtolower($direction) === 'desc' ? 'DESC' : 'ASC';
        $orderColumn = match ($orderBy) {
            'created' => 'f.original_datetime',
            default => 'f.file_path',
        };

        $conn = $this->entityManager->getConnection();

        $baseSql = <<<'SQL'
FROM web_site_gallery g
JOIN web_site_gallery_file gf ON gf.gallery_id = g.id
JOIN web_site_file f ON f.id = gf.file_id
LEFT JOIN web_site_acl a
       ON a.acl_id = f.acl_id
WHERE (a.user_id = :userId
   OR a.acl_id IS NULL)
   AND g.gallery_id = :externalGalleryId
SQL;

        // Stub search: currently no filtering, but placeholder for future use
        if (!empty($searchTerms)) {
            // Example stub: A WHERE 1=1 block to be replaced later
            $baseSql .= ' AND 1 = 1';
        }

        $countSql = 'SELECT COUNT(*) ' . $baseSql;
        $total = (int)$conn->fetchOne(
            $countSql,
            ['externalGalleryId' => $externalGalleryId, 'userId' => $userId],
            ['externalGalleryId' => ParameterType::INTEGER, 'userId' => ParameterType::INTEGER]
        );

        $offset = ($page - 1) * $perPage;
        $limitSql = sprintf(
            'SELECT %s %s ORDER BY %s %s LIMIT :limit OFFSET :offset',
            self::getGalleryFileSelectColumns(),
            $baseSql,
            $orderColumn,
            $direction
        );
        $stmt = $conn->prepare($limitSql);
        $stmt->bindValue('externalGalleryId', $externalGalleryId, ParameterType::INTEGER);
        $stmt->bindValue('userId', $userId, ParameterType::INTEGER);
        $stmt->bindValue('limit', $perPage, ParameterType::INTEGER);
        $stmt->bindValue('offset', $offset, ParameterType::INTEGER);
        $items = $stmt->executeQuery()->fetchAllAssociative();

        return ['items' => array_map([self::class, 'mapGalleryFileRow'], $items), 'total' => $total];
    }

    /**
     * Return internal gallery id (g.id) for the given external gallery_id, or null if not found.
     */
    public function findInternalIdByExternalGalleryId(int $externalGalleryId, int $userId): ?int
    {
        $conn = $this->entityManager->getConnection();
        $sql = <<< 'SQL'
SELECT g.id
FROM web_site_gallery g
LEFT JOIN web_site_acl a
       ON a.acl_id = g.acl_id
WHERE (a.user_id = :userId
   OR a.acl_id IS NULL)
   AND g.gallery_id = :externalGalleryId
LIMIT 1
SQL;
        $row = $conn->fetchAssociative(
            $sql,
            ['userId' => $userId, 'externalGalleryId' => $externalGalleryId],
            ['userId' => ParameterType::INTEGER, 'externalGalleryId' => ParameterType::INTEGER]
        );
        if (!$row) {
            return null;
        }

        return isset($row['id']) ? (int)$row['id'] : null;
    }

    /**
     * @param array<int> $ids
     * @return array<int, WebSiteGallery>
     */
    public function findByIds(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if ($ids === []) {
            return [];
        }

        return $this->entityManager
            ->getRepository(WebSiteGallery::class)
            ->findBy(['id' => $ids]);
    }

    public function getEntityManager(): EntityManagerInterface
    {
        return $this->entityManager;
    }

    private static function getGalleryFileSelectColumns(): string
    {
        return <<<'SQL'
f.id,
f.file_id,
f.acl_id,
f.comment,
f.file_path,
f.mimetype,
f.original_datetime,
f.rights_holder,
f.rights_terms,
f.rights_url,
f.creator_name,
f.creator_email,
f.creator_country,
f.creator_url,
f.location_id,
f.width,
f.height,
f.length,
f.pages,
f.metadata
SQL;
    }

    private static function mapGalleryFileRow(array $row): array
    {
        return [
            'id' => isset($row['id']) ? (int)$row['id'] : 0,
            'fileId' => isset($row['file_id']) ? (int)$row['file_id'] : 0,
            'aclId' => isset($row['acl_id']) ? (int)$row['acl_id'] : 0,
            'comment' => $row['comment'] ?? '',
            'filePath' => $row['file_path'] ?? '',
            'mimetype' => $row['mimetype'] ?? '',
            'originalDateTime' => $row['original_datetime'] ?? '',
            'rightsHolder' => $row['rights_holder'] ?? null,
            'rightsTerms' => $row['rights_terms'] ?? null,
            'rightsUrl' => $row['rights_url'] ?? null,
            'creatorName' => $row['creator_name'] ?? null,
            'creatorEmail' => $row['creator_email'] ?? null,
            'creatorCountry' => $row['creator_country'] ?? null,
            'creatorUrl' => $row['creator_url'] ?? null,
            // keep raw location_id out of DTO output; enrich to 'location' in API layer when authenticated
            'location' => null,
            // internal use for enrichment
            '_location_id' => isset($row['location_id']) ? (int)$row['location_id'] : null,
            'width' => isset($row['width']) ? (int)$row['width'] : 0,
            'height' => isset($row['height']) ? (int)$row['height'] : 0,
            'length' => isset($row['length']) ? (int)$row['length'] : 0,
            'pages' => isset($row['pages']) ? (int)$row['pages'] : 0,
            'metadata' => $row['metadata'] ?? null,
        ];
    }
}
