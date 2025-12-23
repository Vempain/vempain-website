<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteConfiguration;

class WebSiteConfigurationRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function findAllKeyValuePairs(): array
    {
        $entries = $this->getAllEntries();
        $result = [];
        foreach ($entries as $entry) {
            $value = $entry->getConfigValue();
            if ($value === '' || $value === null) {
                $value = $entry->getConfigDefault();
            }
            $result[$entry->getConfigKey()] = $value;
        }
        return $result;
    }

    private function getAllEntries(): array
    {
        return $this->entityManager
            ->getRepository(WebSiteConfiguration::class)
            ->findAll();
    }
}

