<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebGpsLocation;

class WebGpsLocationRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function findById(int $id): ?WebGpsLocation
    {
        return $this->entityManager->getRepository(WebGpsLocation::class)->find($id);
    }

    /**
     * @param array<int> $ids
     * @return array<int, WebGpsLocation>
     */
    public function findByIds(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if ($ids === []) {
            return [];
        }

        $items = $this->entityManager->getRepository(WebGpsLocation::class)->findBy(['id' => $ids]);
        $map = [];
        foreach ($items as $item) {
            $map[$item->getId()] = $item;
        }
        return $map;
    }
}
