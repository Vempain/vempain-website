<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteAcl;

class WebSiteAclRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function userHasAccess(int $aclId, int $userId): bool
    {
        return $this->entityManager
                ->getRepository(WebSiteAcl::class)
                ->findOneBy(['aclId' => $aclId, 'userId' => $userId]) !== null;
    }

    public function aclRequiresAuth(int $aclId): bool
    {
        return $this->entityManager
                ->getRepository(WebSiteAcl::class)
                ->findOneBy(['aclId' => $aclId]) !== null;
    }
}
