<?php

namespace Vempain\VempainWebsite\Application\Service;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;
use Vempain\VempainWebsite\Application\Transformer\SubjectTransformer;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;

class PageService
{
    private const int DEFAULT_PER_PAGE = 12;
    private const int MAX_PER_PAGE = 50;

    public function __construct(
        private readonly WebSitePageRepository $pageRepository,
        private readonly WebSiteSubjectRepository $subjectRepository,
        private readonly SubjectTransformer $subjectTransformer,
        private readonly PageCacheEvaluator $pageCacheEvaluator,
        private readonly LoggerInterface $logger,
        private readonly ResourceAccessService $resourceAccessService,
    ) {
    }

    public function handlePageRequest(ServerRequestInterface $request): ?ResponseInterface
    {
        $path = $request->getUri()->getPath();
        if ($path === '/' || $path === '') {
            $path = 'index';
        } else {
            $path = ltrim($path, '/');
        }

        if (str_starts_with($path, 'api') || str_starts_with($path, 'file')) {
            return null;
        }

        $page = $this->pageRepository->findByFilePath($path);

        if (!$page) {
            return null;
        }

        $claims = $request->getAttribute('jwt');
        $denied = $this->resourceAccessService->getDeniedStatus($page->getAclId(), $claims);
        if ($denied !== null) {
            return $this->denyResponse($denied);
        }

        $body = $this->pageCacheEvaluator->render($page);
        if ($body === null) {
            return $this->errorResponse();
        }

        $payload = [
            'id' => $page->getId(),
            'acl_id' => $page->getAclId(),
            'page_id' => $page->getPageId(),
            'header' => $page->getHeader(),
            'title' => $page->getTitle(),
            'file_path' => $page->getFilePath(),
            'body' => $body,
            'page_style' => $page->getPageStyle(),
            'embeds' => $page->getEmbeds(),
            'subjects' => $this->subjectTransformer->manyFromEntities($page->getSubjects()),
            'creator' => $page->getCreator(),
            'created' => $page->getCreated()->format('c'),
            'modifier' => $page->getModifier(),
            'modified' => $page->getModified()?->format('c'),
            'secure' => $page->isSecure()
        ];

        $response = new Response();
        $response->getBody()->write(json_encode($payload));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function denyResponse(int $status): ResponseInterface
    {
        $response = new Response($status);
        $message = $status === 401 ? 'Authentication required' : 'Forbidden';
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function errorResponse(): ResponseInterface
    {
        $response = new Response(500);
        $response->getBody()->write(json_encode(['error' => 'Failed to render page']));
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function listPages(
        int $page,
        int $perPage,
        string $sortDirection,
        string $search,
        ?string $pathPrefix,
        int $userId
    ): array {
        $page = max(0, $page);
        $perPage = max(1, min(self::MAX_PER_PAGE, $perPage));
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $searchTerms = $this->tokenizeSearch($search);

        $pages = $this->pageRepository->findAccessiblePages(
            $page,
            $perPage,
            $searchTerms,
            $sortDirection,
            $pathPrefix,
            $userId
        );
        $this->subjectRepository->eagerLoadForPages($pages);
        $total = $this->pageRepository->countPublicPages($searchTerms, $pathPrefix, $userId);
        $totalPages = $perPage > 0 ? (int)ceil($total / $perPage) : 0;

        return [
            'content' => array_map(function ($pageEntity) {
                return [
                    'id' => $pageEntity->getId(),
                    'pageId' => $pageEntity->getPageId(),
                    'title' => $pageEntity->getTitle(),
                    'header' => $pageEntity->getHeader(),
                    'file_path' => $pageEntity->getFilePath(),
                    'secure' => $pageEntity->isSecure(),
                    'aclId' => $pageEntity->getAclId(),
                    'published' => $pageEntity->getPublished()?->format('c'),
                    'embeds' => $pageEntity->getEmbeds(),
                    'subjects' => $this->subjectTransformer->manyFromEntities($pageEntity->getSubjects()),
                ];
            }, $pages),
            'page' => $page,
            'size' => $perPage,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'empty' => $total === 0,
        ];
    }

    private function tokenizeSearch(string $search): array
    {
        $search = trim($search);
        if ($search === '') {
            return [];
        }

        preg_match_all('/"([^"]+)"|(\\S+)/u', $search, $matches, PREG_SET_ORDER);
        $terms = [];
        foreach ($matches as $match) {
            $terms[] = isset($match[1]) && $match[1] !== '' ? $match[1] : $match[2];
        }

        return array_values(array_filter($terms, fn($term) => $term !== null && $term !== ''));
    }

    public function getTopLevelDirectories(): array
    {
        return array_map(
            fn(string $directory) => ['name' => $directory],
            $this->pageRepository->findTopLevelDirectories()
        );
    }

    public function getDirectoryTree(string $directory, int $userId): array
    {
        $pages = $this->pageRepository->findByDirectory($directory, $userId);
        $this->subjectRepository->eagerLoadForPages($pages);

        return $this->buildDirectoryTree($pages, $directory);
    }

    private function buildDirectoryTree(array $pages, string $directory): array
    {
        $tree = [];
        foreach ($pages as $page) {
            $relativePath = substr($page->getFilePath(), strlen($directory) + 1);
            $segments = explode('/', $relativePath);
            $this->insertIntoTree($tree, $segments, $page);
        }

        return $tree;
    }

    private function insertIntoTree(array &$tree, array $segments, $page): void
    {
        if (count($segments) === 1) {
            $tree[] = [
                'title' => $segments[0],
                'key' => $page->getFilePath(),
                'isLeaf' => true,
            ];
            return;
        }

        $head = array_shift($segments);
        foreach ($tree as &$node) {
            if ($node['title'] === $head) {
                $node['children'] = $node['children'] ?? [];
                $this->insertIntoTree($node['children'], $segments, $page);
                return;
            }
        }

        $child = ['title' => $head, 'key' => $head, 'children' => []];
        $this->insertIntoTree($child['children'], $segments, $page);
        $tree[] = $child;
    }

    public function getPageContent(string $path, ?array $claims = null): array|ResponseInterface|null
    {
        $page = $this->pageRepository->findByFilePath($path);

        if (!$page) {
            $this->logger->warning("Did not find page content for path: {$path}");
            return null;
        }

        $denied = $this->resourceAccessService->getDeniedStatus($page->getAclId(), $claims);
        if ($denied !== null) {
            return $this->denyResponse($denied);
        }

        $body = $this->pageCacheEvaluator->render($page);

        if ($body === null) {
            return null;
        }

        return [
            'id' => $page->getId(),
            'acl_id' => $page->getAclId(),
            'page_id' => $page->getPageId(),
            'header' => $page->getHeader(),
            'title' => $page->getTitle(),
            'file_path' => $page->getFilePath(),
            'body' => $body,
            'page_style' => $page->getPageStyle(),
            'embeds' => $page->getEmbeds(),
            'subjects' => $this->subjectTransformer->manyFromEntities($page->getSubjects()),
            'creator' => $page->getCreator(),
            'created' => $page->getCreated()->format('c'),
            'modifier' => $page->getModifier(),
            'modified' => $page->getModified()?->format('c'),
            'secure' => $page->isSecure()
        ];
    }
}
