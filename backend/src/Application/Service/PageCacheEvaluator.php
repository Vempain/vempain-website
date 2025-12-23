<?php

namespace Vempain\VempainWebsite\Application\Service;

use PDO;
use Psr\Log\LoggerInterface;
use Throwable;
use Vempain\VempainWebsite\Domain\Entity\WebSitePage;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;

class PageCacheEvaluator
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly LoggerInterface $logger,
        private readonly WebSitePageRepository $pageRepository,
        private readonly LegacyEmbedParser $legacyEmbedParser,
    ) {
    }

    public function render(WebSitePage $page): ?string
    {
        if ($page->getCache()) {
            return $page->getCache();
        }

        $pageInfo = [
            'path' => $page->getPath(),
            'page_id' => $page->getPageId(),
            'title' => $page->getTitle(),
            'header' => $page->getHeader(),
            'body' => $page->getBody(),
            'secure' => $page->isSecure(),
            'acl_id' => $page->getAclId(),
            'creator' => $page->getCreator(),
            'created' => $page->getCreated()->format('c'),
            'modifier' => $page->getModifier(),
            'modified' => $page->getModified()?->format('c'),
            'db_handle' => $this->pdo,
        ];

        $rawBody = $page->getBody() ?? '';

        $this->logger->debug('Evaluating page body', ['page' => $page->getId()]);

        ob_start();
        $content = null;
        $tmpFile = null;
        try {
            $PAGE_INFO = $pageInfo; // available to included page
            $db_handle = $this->pdo;
            $this->includeHelpers();

            $evalRes = eval($rawBody);

            if ($evalRes !== null) {
                $this->logger->error('===================================================================');
                $this->logger->error($rawBody);
                $this->logger->error('===================================================================');
            }

            $content = ob_get_clean();
        } catch (Throwable $throwable) {
            if (ob_get_level() > 0) {
                ob_end_clean();
            }
            $this->logger->error('Page evaluation failed', [
                'page' => $page->getId(),
                'error' => $throwable->getMessage(),
            ]);

            return null;
        }

        if ($content !== null) {
            $embeds = $this->legacyEmbedParser->parse($rawBody);
            $this->pageRepository->updateCacheAndEmbeds($page, $content, $embeds);
        }

        return $content;
    }

    private function includeHelpers(): void
    {
        $helperDir = $_ENV['VEMPAIN_WEBSITE_HELPERS_DIR'] ?? null;
        if ($helperDir && is_dir($helperDir)) {
            foreach (glob(rtrim($helperDir, '/') . '/*.php') as $helperFile) {
                include_once $helperFile;
            }
        }

        $shimDir = dirname(__DIR__, 2) . '/legacy/shims/lib';
        if (is_dir($shimDir)) {
            foreach (glob($shimDir . '/*.php') as $shimFile) {
                include_once $shimFile;
            }
        }
    }
}
