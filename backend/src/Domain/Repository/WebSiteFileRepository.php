<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteFile;

class WebSiteFileRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function findAll(): array
    {
        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->findAll();
    }

    public function findById(int $id): ?WebSiteFile
    {
        return $this->entityManager
            ->getRepository(WebSiteFile::class)
            ->find($id);
    }

    public function findByPath(string $path): ?WebSiteFile
    {
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
