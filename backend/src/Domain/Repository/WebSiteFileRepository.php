<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Vempain\VempainWebsite\Domain\Entity\WebSiteFile;
use Vempain\VempainWebsite\Domain\Entity\WebSiteUser;

class WebSiteFileRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function findAllFilesForUser(int $userId): array
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('f')
            ->from(WebSiteFile::class, 'f')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = f.aclId')
            ->andWhere($qb->expr()->orX(
                'f.aclId IS NULL',
                'a.userId = :userId',
                'EXISTS (SELECT 1 FROM ' . WebSiteUser::class . ' wsu WHERE wsu.id = :userId AND wsu.globalPermission = TRUE)'
            ))
            ->setParameter('userId', $userId)
            ->orderBy('f.id', 'DESC');

        return $qb->getQuery()->getResult();
    }

    public function findById(int $id): ?WebSiteFile
    {
        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->find($id);
    }

    public function findByFileId(int $fileId): ?WebSiteFile
    {
        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->findOneBy(['fileId' => $fileId]);
    }

    public function findByFilePath(int $userId, string $filePath): ?WebSiteFile
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('f')
            ->from(WebSiteFile::class, 'f')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = f.aclId')
            ->andWhere($qb->expr()->orX(
                'a.aclId IS NULL',
                'a.userId = :userId',
                'EXISTS (SELECT 1 FROM ' . WebSiteUser::class . ' wsu WHERE wsu.id = :userId AND wsu.globalPermission = TRUE)'
            ))
            ->setParameter('userId', $userId)
            ->andWhere('f.filePath = :filePath')
            ->setParameter('filePath', $filePath);

        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * @param array<int> $ids
     * @return array<int, WebSiteFile>
     */
    public function findByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->findBy(['id' => $ids]);
    }

    public function getEntityManager(): EntityManagerInterface
    {
        return $this->entityManager;
    }

    public function findLatestByTypeForUser(int $userId, string $type, int $count): array
    {
        $count = max(1, min(50, $count));

        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('f')
            ->from(WebSiteFile::class, 'f')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = f.aclId')
            ->andWhere(
                $qb->expr()->orX(
                    'a.aclId IS NULL',
                    'a.userId = :userId',
                    'EXISTS (SELECT 1 FROM ' . WebSiteUser::class . ' wsu WHERE wsu.id = :userId AND wsu.globalPermission = TRUE)'
                )
            )
            ->setParameter('userId', $userId);

        $this->applyTypeFilter($qb, $type);

        $qb
            ->orderBy('f.originalDateTime', 'DESC')
            ->addOrderBy('f.id', 'DESC')
            ->setMaxResults($count);

        return $qb->getQuery()->getResult();
    }

    private function applyTypeFilter(QueryBuilder $qb, string $type): void
    {
        $type = strtolower($type);

        if ($type === 'images') {
            $qb->andWhere('LOWER(f.mimetype) LIKE :imageMime')
                ->setParameter('imageMime', 'image/%');
            return;
        }

        if ($type === 'videos') {
            $qb->andWhere('LOWER(f.mimetype) LIKE :videoMime')
                ->setParameter('videoMime', 'video/%');
            return;
        }

        if ($type === 'audio') {
            $qb->andWhere('LOWER(f.mimetype) LIKE :audioMime')
                ->setParameter('audioMime', 'audio/%');
            return;
        }

        if ($type === 'documents') {
            $qb
                ->andWhere('LOWER(f.mimetype) NOT LIKE :imageMime')
                ->andWhere('LOWER(f.mimetype) NOT LIKE :videoMime')
                ->andWhere('LOWER(f.mimetype) NOT LIKE :audioMime')
                ->setParameter('imageMime', 'image/%')
                ->setParameter('videoMime', 'video/%')
                ->setParameter('audioMime', 'audio/%');
        }
    }
}
