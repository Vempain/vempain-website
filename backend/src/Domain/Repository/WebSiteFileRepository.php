<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteFile;

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
            ->andWhere($qb->expr()->orX('f.aclId IS NULL', 'a.userId = :userId'))
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

    public function findByFilePath(int $userId, string $file_path): ?WebSiteFile
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('f')
            ->from(WebSiteFile::class, 'f')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = f.aclId')
            ->andWhere($qb->expr()->orX('a.aclId IS NULL', 'a.userId = :userId'))
            ->setParameter('userId', $userId)
            ->andWhere('f.filePath = :filePath')
            ->setParameter('filePath', $file_path);

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
}
