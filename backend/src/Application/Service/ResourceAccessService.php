<?php

namespace Vempain\VempainWebsite\Application\Service;

class ResourceAccessService
{
    public function __construct(private readonly AclService $aclService)
    {
    }

    /**
     * Returns null when access is permitted.
     * Otherwise returns 401 (requires login) or 403 (authenticated but forbidden).
     */
    public function getDeniedStatus(?int $aclId, ?array $claims): ?int
    {
        if ($aclId === null || $aclId === 0) {
            return null;
        }

        if (!$this->aclService->canAccess($aclId, $claims)) {
            // If no claims at all, treat as unauthenticated
            return $claims === null ? 401 : 403;
        }

        return null;
    }
}
