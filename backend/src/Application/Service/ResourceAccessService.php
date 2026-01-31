<?php

namespace Vempain\VempainWebsite\Application\Service;

use Psr\Log\LoggerInterface;

class ResourceAccessService
{
    public function __construct(
        private readonly AclService $aclService,
        private readonly LoggerInterface $logger
    ) {
    }

    /**
     * Returns null when access is permitted.
     * Otherwise, returns 401 (requires login) or 403 (authenticated but forbidden).
     */
    public function getDeniedStatus(?int $aclId, ?array $claims): ?int
    {
        if ($aclId === null || $aclId === 0) {
            return null;
        }

        if ($claims !== null && isset($claims['global_permission'])) {
            $this->logger->debug('Claims contains global permission', [
                'claims' => $claims,
            ]);

            if ($claims['global_permission']) {
                return null;
            }
        }

        $this->logger->debug('Checking if ACL service is negative for ACL ID:', [
            'aclId' => $aclId,
            'claims' => $claims,
        ]);

        if (!$this->aclService->canAccess($aclId, $claims)) {
            $this->logger->debug('No access granted for ACL ID:', [
                'aclId' => $aclId,
                'claims' => $claims,
                'falling_back_to_status' => $claims === null ? 401 : 403,
            ]);
            // If no claims at all, treat as unauthenticated
            return $claims === null ? 401 : 403;
        }

        return null;
    }
}
