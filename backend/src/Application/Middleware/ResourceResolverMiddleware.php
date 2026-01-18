<?php

namespace Vempain\VempainWebsite\Application\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Vempain\VempainWebsite\Application\Service\FileService;
use Vempain\VempainWebsite\Application\Service\PageService;

class ResourceResolverMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly FileService $fileService,
        private readonly LoggerInterface $logger,
        private readonly PageService $pageService,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $filePath = $request->getUri()->getPath();

        // Skip API and health endpoints so Slim routing handles them normally
        if (str_starts_with($filePath, '/api') || str_starts_with($filePath, '/health')) {
            $this->logger->debug('Skipping ResourceResolverMiddleware for API/health file path', ['filePath' => $filePath]);
            return $handler->handle($request);
        }

        if (str_starts_with($filePath, '/file/')) {
            $this->logger->info("Request is processed with file service");
            $fileResponse = $this->fileService->handleFileRequest($request);

            if ($fileResponse !== null) {
                return $fileResponse;
            }
        }

        $this->logger->info("Request is attempted to be processed with page service");
        $pageResponse = $this->pageService->handlePageRequest($request);

        if ($pageResponse !== null) {
            return $pageResponse;
        }

        $this->logger->info("Request is attempted to be processed with the accompanied handler");
        return $handler->handle($request);
    }
}
