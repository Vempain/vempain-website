<?php

namespace Vempain\VempainWebsite\Application\Service;

use Vempain\VempainWebsite\Domain\Repository\WebSiteAclRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteJwtTokenRepository;

class AclService
{
    public function __construct(
        private readonly WebSiteAclRepository $aclRepository,
        private readonly WebSiteJwtTokenRepository $tokenRepository,
    ) {
    }

    /**
     * Whether the given ACL id exists and therefore requires authentication.
     */
    public function aclRequiresAuth(int $aclId): bool
    {
        return $this->aclRepository->aclRequiresAuth($aclId);
    }

    public function canAccess(?int $aclId, ?array $claims): bool
    {
        if ($aclId === null || $aclId === 0) {
            return true;
        }

        if (!$this->aclRequiresAuth($aclId)) {
            return true;
        }

        if ($claims === null) {
            return false;
        }

        $token = $claims['token'] ?? null;
        $userId = isset($claims['sub']) ? (int)$claims['sub'] : 0;

        if ($token === null || $userId <= 0) {
            return false;
        }

        $tokenEntity = $this->tokenRepository->findValidToken($token);
        if ($tokenEntity === null || $tokenEntity->getUserId() !== $userId) {
            return false;
        }

        return $this->aclRepository->userHasAccess($aclId, $userId);
    }
}
