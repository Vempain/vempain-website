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
            ->andWhere($qb->expr()->orX('p.aclId IS NULL', 'a.userId = :userId'))
            ->setParameter('userId', $userId)
            ->orderBy('f.createdAt', 'DESC');

        return $qb->getQuery()->getResult();
    }

    public function findById(int $id): ?WebSiteFile
    {
        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->find($id);
    }

    public function findByPath(int $userId, string $path): ?WebSiteFile
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb
            ->select('f')
            ->from(WebSiteFile::class, 'f')
            ->leftJoin('Vempain\VempainWebsite\Domain\Entity\WebSiteAcl', 'a', 'WITH', 'a.aclId = f.aclId')
            ->andWhere($qb->expr()->orX('p.aclId IS NULL', 'a.userId = :userId'))
            ->setParameter('userId', $userId)
            ->andWhere('f.path = :path')
            ->setParameter('path', $path);

        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->findOneBy(['path' => $path]);
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
