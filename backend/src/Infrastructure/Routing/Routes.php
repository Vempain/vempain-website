<?php

namespace Vempain\VempainWebsite\Infrastructure\Routing;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteContext;
use Vempain\VempainWebsite\Application\Auth\AuthService;
use Vempain\VempainWebsite\Application\Service\PageService;
use Vempain\VempainWebsite\Application\Service\ResourceAccessService;
use Vempain\VempainWebsite\Application\Service\SubjectSearchService;
use Vempain\VempainWebsite\Application\Transformer\SubjectTransformer;
use Vempain\VempainWebsite\Domain\Repository\WebSiteConfigurationRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteFileRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteGalleryRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;

class Routes
{
    public static function register(App $app): void
    {
        // Health check
        $app->get('/health', function (Request $request, Response $response) {
            $response->getBody()->write(json_encode(['status' => 'ok']));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Authentication
        $app->post('/api/login', function (Request $request, Response $response) use ($app) {
            /** @var AuthService $authService */
            $authService = $app->getContainer()->get(AuthService::class);
            $data = (array)$request->getParsedBody();
            $result = $authService->authenticate($data['username'] ?? '', $data['password'] ?? '');
            if (!$result) {
                $response->getBody()->write(json_encode(['error' => 'Invalid credentials']));
                return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
            }

            $response->getBody()->write(json_encode(['token' => $result['token']]));
            $response = self::applyAuthCookie($response, $result['token']);
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->post('/api/logout', function (Request $request, Response $response) {
            $response->getBody()->write(json_encode(['status' => 'ok']));
            $response = self::clearAuthCookie($response);
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Pages API
        $app->get('/api/pages', function (Request $request, Response $response) use ($app) {
            /** @var WebSitePageRepository $pageRepo */
            $pageRepo = $app->getContainer()->get(WebSitePageRepository::class);
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            $pages = $pageRepo->findAll();
            $subjectRepo->eagerLoadForPages($pages);

            $data = array_map(function ($page) use ($subjectTransformer) {
                return [
                    'id' => $page->getId(),
                    'pageId' => $page->getPageId(),
                    'title' => $page->getTitle(),
                    'path' => $page->getPath(),
                    'header' => $page->getHeader(),
                    'body' => $page->getBody(),
                    'secure' => $page->isSecure(),
                    'aclId' => $page->getAclId(),
                    'subjects' => $subjectTransformer->manyFromEntities($page->getSubjects()),
                ];
            }, $pages);

            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->get('/api/pages/{id}', function (Request $request, Response $response, array $args) use ($app) {
            /** @var WebSitePageRepository $pageRepo */
            $pageRepo = $app->getContainer()->get(WebSitePageRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            $page = $pageRepo->findById((int)$args['id']);

            if (!$page) {
                return $response->withStatus(404);
            }

            $data = [
                'id' => $page->getId(),
                'pageId' => $page->getPageId(),
                'title' => $page->getTitle(),
                'path' => $page->getPath(),
                'header' => $page->getHeader(),
                'body' => $page->getBody(),
                'secure' => $page->isSecure(),
                'aclId' => $page->getAclId(),
                'subjects' => $subjectTransformer->manyFromEntities($page->getSubjects()),
            ];

            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Files API
        $app->get('/api/files', function (Request $request, Response $response) use ($app) {
            /** @var WebSiteFileRepository $fileRepo */
            $fileRepo = $app->getContainer()->get(WebSiteFileRepository::class);
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            $userId = self::getUserId($request);

            $files = $fileRepo->findAllFilesForUser($userId);

            $fileIds = array_map(static fn($file) => $file->getId(), $files);
            $subjectsByFile = $subjectRepo->findByFileIds($fileIds);

            $data = array_map(function ($file) use ($subjectTransformer, $subjectsByFile) {
                $subjects = $subjectsByFile[$file->getId()] ?? [];
                $file->setSubjects($subjects);

                return [
                    'id' => $file->getId(),
                    'path' => $file->getPath(),
                    'mimetype' => $file->getMimetype(),
                    'aclId' => $file->getAclId(),
                    'subjects' => $subjectTransformer->manyFromEntities($file->getSubjects()),
                ];
            }, $files);

            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // ////////////////////////////////////////////////////////////////////////////////////////
        // Galleries API
        $app->get('/api/galleries', function (Request $request, Response $response) use ($app) {
            /** @var WebSiteGalleryRepository $galleryRepo */
            $galleryRepo = $app->getContainer()->get(WebSiteGalleryRepository::class);
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            $galleries = $galleryRepo->findAll();

            $data = array_map(function ($gallery) use ($subjectRepo, $subjectTransformer) {
                $subjects = $subjectRepo->findByGalleryId($gallery->getId());
                $gallery->setSubjects($subjects);

                return [
                    'id' => $gallery->getId(),
                    'galleryId' => $gallery->getGalleryId(),
                    'shortname' => $gallery->getShortname(),
                    'description' => $gallery->getDescription(),
                    'subjects' => $subjectTransformer->manyFromEntities($gallery->getSubjects()),
                ];
            }, $galleries);

            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Public Galleries API
        $app->get('/api/public/galleries', function (Request $request, Response $response) use ($app) {
            /** @var WebSiteGalleryRepository $galleryRepo */
            $galleryRepo = $app->getContainer()->get(WebSiteGalleryRepository::class);
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            /** @var ResourceAccessService $resourceAccessService */
            $resourceAccessService = $app->getContainer()->get(ResourceAccessService::class);

            $params = $request->getQueryParams();
            $page = isset($params['page']) ? (int)$params['page'] : 0;
            $size = isset($params['perPage']) ? (int)$params['perPage'] : 12;
            $size = max(1, min(50, $size));

            $all = $galleryRepo->findAll();
            // Check which of the galleries are accessible
            $all = array_filter($all, function ($gallery) use ($request, $resourceAccessService) {
                $claims = $request->getAttribute('jwt');
                $deniedStatus = $resourceAccessService->getDeniedStatus($gallery->getAclId(), $claims);
                return $deniedStatus === null;
            });

            $total = count($all);
            $offset = $page * $size;
            $slice = array_slice($all, $offset, $size);
            $galleryIds = array_map(static fn($g) => $g->getId(), $slice);
            $subjectsByGallery = $subjectRepo->findByGalleryIds($galleryIds);

            $data = array_map(function ($gallery) use ($subjectTransformer, $subjectsByGallery) {
                $subjects = $subjectsByGallery[$gallery->getId()] ?? [];
                $gallery->setSubjects($subjects);
                return [
                    'id' => $gallery->getId(),
                    'galleryId' => $gallery->getGalleryId(),
                    'shortname' => $gallery->getShortname(),
                    'description' => $gallery->getDescription(),
                    'subjects' => $subjectTransformer->manyFromEntities($gallery->getSubjects()),
                ];
            }, $slice);

            $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;
            $payload = [
                'content' => $data,
                'page' => $page,
                'size' => $size,
                'total_elements' => $total,
                'total_pages' => $totalPages,
                'first' => $page === 0,
                'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
                'empty' => $total === 0,
            ];

            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });
        // Files for a gallery (public)
        $app->get('/api/galleries/{galleryId}/files', function (Request $request, Response $response) use ($app) {
            $routeContext = RouteContext::fromRequest($request);
            $route = $routeContext->getRoute();
            $galleryIdArg = $route?->getArgument('galleryId');
            $galleryId = is_numeric($galleryIdArg) ? (int)$galleryIdArg : 0;
            $userId = self::getUserId($request);

            try {
                $logger = $app->getContainer()->get(\Psr\Log\LoggerInterface::class);
                $logger->debug('Gallery files route hit', [
                    'galleryId' => $galleryId,
                    'userId' => $userId,
                    'path' => $request->getUri()->getPath(),
                ]);
            } catch (\Throwable $e) {
                // ignore logging failure
            }

            if ($galleryId <= 0) {
                return $response->withStatus(400);
            }

            /** @var \Vempain\VempainWebsite\Domain\Repository\WebSiteGalleryRepository $galleryRepo */
            $galleryRepo = $app->getContainer()->get(
                \Vempain\VempainWebsite\Domain\Repository\WebSiteGalleryRepository::class
            );
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            $internalGalleryId = $galleryRepo->findInternalIdByExternalGalleryId($galleryId, $userId);

            $logger->debug('Internal gallery ID lookup', [
                'userId' => $userId,
                'externalGalleryId' => $galleryId,
                'internalGalleryId' => $internalGalleryId,
            ]);
            if ($internalGalleryId === null) {
                return $response->withStatus(404);
            }

            $params = $request->getQueryParams();
            $page = isset($params['page']) ? (int)$params['page'] : 0;
            $size = isset($params['perPage']) ? (int)$params['perPage'] : 25;
            $size = max(1, min(50, $size));
            $order = $params['order'] ?? 'sort_order';
            $direction = $params['direction'] ?? 'asc';
            $search = $params['search'] ?? '';
            $searchTerms = $search !== '' ? preg_split('/\s+/', trim($search)) : [];

            $result = $galleryRepo->paginateFilesByGalleryExternalId(
                $galleryId,
                $page + 1,
                $size,
                $userId,
                $order,
                $direction,
                $searchTerms ?? []
            );

            if ($result['total'] === 0) {
                return $response->withStatus(404);
            }

            $fileIds = array_map(static fn(array $item): int => (int)$item['id'], $result['items']);
            $subjectsByFile = $subjectRepo->findByFileIds($fileIds);
            $gallerySubjects = $subjectRepo->findByGalleryId($internalGalleryId);

            $itemsWithSubjects = array_map(function (array $item) use ($subjectTransformer, $subjectsByFile) {
                $item['subjects'] = $subjectTransformer->manyFromEntities($subjectsByFile[$item['id']] ?? []);
                return $item;
            }, $result['items']);

            $totalPages = $size > 0 ? (int)ceil($result['total'] / $size) : 0;

            $payload = [
                'content' => $itemsWithSubjects,
                'page' => $page,
                'size' => $size,
                'total_elements' => $result['total'],
                'total_pages' => $totalPages,
                'first' => $page === 0,
                'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
                'empty' => $result['total'] === 0,
                'gallerySubjects' => $subjectTransformer->manyFromEntities($gallerySubjects),
            ];

            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // ////////////////////////////////////////////////////////////////////////////////////////
        // Public Pages API
        $app->get('/api/public/pages', function (Request $request, Response $response) use ($app) {
            /** @var PageService $pageService */
            $pageService = $app->getContainer()->get(PageService::class);

            $params = $request->getQueryParams();
            $page = isset($params['page']) ? (int)$params['page'] : 0;
            $perPage = isset($params['perPage']) ? (int)$params['perPage'] : 12;
            $perPage = max(1, min(50, $perPage));
            $sortDirection = strtolower($params['sortDir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
            $search = $params['search'] ?? '';
            $pathPrefix = $params['directory'] ?? null;
            $userId = self::getUserId($request);

            try {
                $logger = $app->getContainer()->get(\Psr\Log\LoggerInterface::class);
                $logger->debug('User ID retrieved', [
                    'userId' => $userId,
                    'path' => $request->getUri()->getPath(),
                ]);
            } catch (\Throwable $e) {
                // ignore logging failure
            }

            $payload = $pageService->listPages(
                $page,
                $perPage,
                $sortDirection,
                $search,
                $pathPrefix,
                $userId
            );
            $response->getBody()->write(json_encode($payload));

            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->get('/api/public/page-directories', function (Request $request, Response $response) use ($app) {
            /** @var PageService $pageService */
            $pageService = $app->getContainer()->get(PageService::class);
            $response->getBody()->write(json_encode($pageService->getTopLevelDirectories()));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->get(
            '/api/public/page-directories/{directory}/tree',
            function (Request $request, Response $response) use ($app) {
                /** @var PageService $pageService */
                $pageService = $app->getContainer()->get(PageService::class);
                $userId = self::getUserId($request);

                try {
                    $logger = $app->getContainer()->get(\Psr\Log\LoggerInterface::class);
                    $logger->debug('User ID for tree retrieved', [
                        'userId' => $userId,
                        'path' => $request->getUri()->getPath(),
                    ]);
                } catch (\Throwable $e) {
                    // ignore logging failure
                }

                $route = RouteContext::fromRequest($request)->getRoute();
                $directory = $route?->getArgument('directory') ?? '';

                if ($directory === '') {
                    return $response->withStatus(400);
                }

                $tree = $pageService->getDirectoryTree($directory, $userId);
                $response->getBody()->write(json_encode($tree));

                return $response->withHeader('Content-Type', 'application/json');
            }
        );

        $app->get('/api/public/page-content', function (Request $request, Response $response) use ($app) {
            $path = $request->getQueryParams()['path'] ?? '';
            if ($path === '') {
                return $response->withStatus(400);
            }

            /** @var PageService $pageService */
            $pageService = $app->getContainer()->get(PageService::class);
            $claims = $request->getAttribute('jwt');
            $content = $pageService->getPageContent($path, $claims);

            if ($content === null) {
                return $response->withStatus(404);
            }

            if ($content instanceof Response) {
                return $content;
            }

            $response
                ->getBody()
                ->write(json_encode($content));

            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->get('/api/public/configuration', function (Request $request, Response $response) use ($app) {
            /** @var WebSiteConfigurationRepository $configurationRepo */
            $configurationRepo = $app->getContainer()->get(WebSiteConfigurationRepository::class);
            $payload = $configurationRepo->findAllKeyValuePairs();
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Debug endpoint: return cache and embeds for a page (dev-only)
        $app->get('/api/debug/page-cache', function (Request $request, Response $response) use ($app) {
            $path = $request->getQueryParams()['path'] ?? '';
            if ($path === '') {
                return $response->withStatus(400);
            }

            /** @var WebSitePageRepository $pageRepo */
            $pageRepo = $app->getContainer()->get(WebSitePageRepository::class);
            $page = $pageRepo->findByPath($path);
            if (!$page) {
                return $response->withStatus(404);
            }

            $payload = [
                'path' => $page->getPath(),
                'cache' => $page->getCache(),
                'embeds' => $page->getEmbeds(),
                'embeds_raw' => $page->getEmbedsRaw(),
            ];

            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });

        // Public Files API
        $app->get('/api/public/files', function (Request $request, Response $response) use ($app) {
            /** @var WebSiteFileRepository $fileRepo */
            $fileRepo = $app->getContainer()->get(WebSiteFileRepository::class);
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);
            $params = $request->getQueryParams();
            $page = isset($params['page']) ? (int)$params['page'] : 0;
            $size = isset($params['perPage']) ? (int)$params['perPage'] : 12;
            $size = max(1, min(50, $size));
            $userId = self::getUserId($request);

            $allFiles = $fileRepo->findAllFilesForUser($userId);
            $total = count($allFiles);
            $offset = $page * $size;
            $files = array_slice($allFiles, $offset, $size);

            $fileIds = array_map(static fn($file) => $file->getId(), $files);
            $subjectsByFile = $subjectRepo->findByFileIds($fileIds);

            $items = array_map(function ($file) use ($subjectTransformer, $subjectsByFile) {
                $subjects = $subjectsByFile[$file->getId()] ?? [];
                $file->setSubjects($subjects);

                return [
                    'id' => $file->getId(),
                    'path' => $file->getPath(),
                    'mimetype' => $file->getMimetype(),
                    'aclId' => $file->getAclId(),
                    'subjects' => $subjectTransformer->manyFromEntities($file->getSubjects()),
                ];
            }, $files);

            $totalPages = $size > 0 ? (int)ceil($total / $size) : 0;

            $payload = [
                'content' => $items,
                'page' => $page,
                'size' => $size,
                'total_elements' => $total,
                'total_pages' => $totalPages,
                'first' => $page === 0,
                'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
                'empty' => $total === 0,
            ];

            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->post('/api/public/subject-search', function (Request $request, Response $response) use ($app) {
            /** @var SubjectSearchService $service */
            $service = $app->getContainer()->get(SubjectSearchService::class);

            $body = (array)$request->getParsedBody();
            $page = isset($body['page']) ? (int)$body['page'] : 0;
            $size = isset($body['size']) ? (int)$body['size'] : 12;
            $sortBy = $body['sort_by'] ?? 'id';
            $direction = strtolower($body['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
            $search = $body['search'] ?? '';
            $caseSensitive = (bool)($body['case_sensitive'] ?? false);

            $payload = $service->searchBySubject($search, $caseSensitive, $page, $size, $sortBy, $direction);
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->get('/api/public/subjects/autocomplete', function (Request $request, Response $response) use ($app) {
            /** @var WebSiteSubjectRepository $subjectRepo */
            $subjectRepo = $app->getContainer()->get(WebSiteSubjectRepository::class);
            /** @var SubjectTransformer $subjectTransformer */
            $subjectTransformer = $app->getContainer()->get(SubjectTransformer::class);

            $term = (string)($request->getQueryParams()['q'] ?? '');
            $subjects = $subjectRepo->autocomplete($term);
            $payload = $subjectTransformer->manyFromEntities($subjects);

            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->post('/api/public/subjects/search', function (Request $request, Response $response) use ($app) {
            /** @var SubjectSearchService $service */
            $service = $app->getContainer()->get(SubjectSearchService::class);
            $body = (array)$request->getParsedBody();
            $subjectIds = array_values(array_filter(array_map('intval', $body['subjectIds'] ?? [])));
            $page = isset($body['page']) ? (int)$body['page'] : 0;
            $size = isset($body['size']) ? (int)$body['size'] : 12;
            $sortBy = $body['sort_by'] ?? 'id';
            $direction = strtolower($body['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
            $userId = self::getUserId($request);

            $payload = $service->searchBySubjectIds($userId, $subjectIds, $page, $size, $sortBy, $direction);
            $response->getBody()->write(json_encode($payload));
            return $response->withHeader('Content-Type', 'application/json');
        });
    }

    private static function applyAuthCookie(Response $response, string $token): Response
    {
        $cookieParts = [
            sprintf('jwt=%s', urlencode($token)),
            'Path=/',
            'HttpOnly',
            'SameSite=Lax',
        ];

        if (!empty($_ENV['COOKIE_SECURE']) && $_ENV['COOKIE_SECURE'] === 'true') {
            $cookieParts[] = 'Secure';
        }

        if (!empty($_ENV['COOKIE_DOMAIN'])) {
            $cookieParts[] = 'Domain=' . $_ENV['COOKIE_DOMAIN'];
        }

        return $response->withHeader('Set-Cookie', implode('; ', $cookieParts));
    }

    private static function clearAuthCookie(Response $response): Response
    {
        $cookieParts = [
            'jwt=deleted',
            'Path=/',
            'HttpOnly',
            'SameSite=Lax',
            'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        ];

        if (!empty($_ENV['COOKIE_SECURE']) && $_ENV['COOKIE_SECURE'] === 'true') {
            $cookieParts[] = 'Secure';
        }

        if (!empty($_ENV['COOKIE_DOMAIN'])) {
            $cookieParts[] = 'Domain=' . $_ENV['COOKIE_DOMAIN'];
        }

        return $response->withHeader('Set-Cookie', implode('; ', $cookieParts));
    }

    /**
     * @param mixed $claims
     * @return int
     */
    private static function getUserId(Request $request): int
    {
        $claims = $request->getAttribute('jwt');
        $userId = -1;

        if (is_array($claims)) {
            if (isset($claims['sub'])) {
                $userId = (int)$claims['sub'];
            } elseif (isset($claims['id'])) {
                $userId = (int)$claims['id'];
            }
        }
        return $userId;
    }
}
