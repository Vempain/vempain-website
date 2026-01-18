<?php

namespace Vempain\VempainWebsite\Application\Service;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Vempain\VempainWebsite\Application\Transformer\SubjectTransformer;
use Vempain\VempainWebsite\Domain\Repository\WebSiteFileRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;

class FileService
{
    public function __construct(
        private readonly WebSiteFileRepository $fileRepository,
        private readonly WebSiteSubjectRepository $subjectRepository,
        private readonly SubjectTransformer $subjectTransformer,
        private readonly string $filesRoot,
        private readonly ResourceAccessService $resourceAccessService,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @param Request $request
     * @return int
     */
    private static function getUserId(ServerRequestInterface $request): int
    {
        $claims = $request->getAttribute('jwt');

        if (!is_array($claims)) {
            return -1;
        }

        // Try 'sub' first (standard JWT claim), then 'id' as fallback
        $userId = $claims['sub'] ?? $claims['id'] ?? null;

        if ($userId === null) {
            return -1;
        }

        // Ensure it's a positive integer
        $userId = filter_var($userId, FILTER_VALIDATE_INT, FILTER_FLAG_ALLOW_OCTAL | FILTER_FLAG_ALLOW_HEX);
        return $userId !== false && $userId > 0 ? $userId : -1;
    }

    public function handleFileRequest(ServerRequestInterface $request): ?ResponseInterface
    {
        $path = $request->getUri()->getPath();
        if (!str_starts_with($path, '/file/')) {
            return null;
        }

        $userId = self::getUserId($request);

        $relativePathEncoded = ltrim(substr($path, strlen('/file/')), '/');
        $relativePath = rawurldecode($relativePathEncoded);
        $this->logger->debug('XXXXXXXXX  Fetching file with path", ['userId' => $userId, 'relativePath' => $relativePath]);
        $fileData = $this->getFileByPath($userId, $relativePath);
        $this->logger->debug('XXXXXXXXX  File data retrieval result", ['fileDataFound' => $fileData !== null]);

        if (!$fileData) {
            $this->logger->debug('XXXXXXXXX  Did not find file from path", ['userId' => $userId, 'relativePath' => $relativePath]);
            return $this->forbiddenResponse();
        }

        $claims = $request->getAttribute('jwt');
        $denied = $this->resourceAccessService->getDeniedStatus($fileData['aclId'], $claims);
        $this->logger->debug('XXXXXXXXX  Got denied status for resource", ['userId' => $userId, 'relativePath' => $relativePath, 'deniedStatus' => $denied]);

        if ($denied !== null) {
            $this->logger->debug('XXXXXXXXX  Resource access denied", ['userId' => $userId, 'relativePath' => $relativePath, 'deniedStatus' => $denied]);
            return $this->denyResponse($denied);
        }

        return $this->streamFile($request, $fileData);
    }

    private function getFileByPath(int $userId, string $filePath): ?array
    {
        $this->logger->debug('XXXXXXXXX  Looking up file by file path", ['userId' => $userId, 'file_path' => $filePath]);
        $filesystemRelativePath = $filePath;
        $fileEntity = $this->fileRepository->findByFilePath($userId, $filePath);
        $this->logger->debug('XXXXXXXXX  Database search result", ['fileEntityFound' => $fileEntity !== null]);

        if (!$fileEntity && str_contains($filePath, '/.thumb/')) {
            $this->logger->debug('XXXXXXXXX  Detected thumbnail path, attempting fallback", ['filePath' => $filePath]);
            $fallbackPath = preg_replace('#/\.thumb/#', '/', $filePath, 1);
            $this->logger->debug('XXXXXXXXX  Searching for fallback file path", ['fallbackPath' => $fallbackPath]);
            $fileEntity = $this->fileRepository->findByFilePath($userId, $fallbackPath);
            $this->logger->debug('XXXXXXXXX  Found fallback file entity", ['fileEntityFound' => $fileEntity !== null]);

            if ($fileEntity) {
                $this->logger->debug('XXXXXXXXX  Updating filesystem relative path for thumbnail", ['originalPath' => $filePath, 'newPath' => $fallbackPath]);
                $filesystemRelativePath = $filePath;
            }
        }

        if (!$fileEntity) {
            return null;
        }

        $fullPath = rtrim($this->filesRoot, '/') . '/' . ltrim($filesystemRelativePath, '/');
        $this->logger->debug('XXXXXXXXX  Trimmed full path", ['fullPath' => $fullPath]);

        if (!file_exists($fullPath) || !is_readable($fullPath)) {
            $this->logger->debug('XXXXXXXXX  Did not find or cannot read file at path", ['fullPath' => $fullPath]);
            return null;
        }

        return [
            'entity' => $fileEntity,
            'fullPath' => $fullPath,
            'mimetype' => $fileEntity->getMimetype(),
            'comment' => $fileEntity->getComment(),
            'metadata' => $fileEntity->getMetadata(),
            'aclId' => $fileEntity->getAclId(),
            'subjects' => $this->subjectTransformer->manyFromEntities(
                $fileEntity->getSubjects() ?: $this->subjectRepository->findByFileId($fileEntity->getId())
            ),
        ];
    }

    private function forbiddenResponse(): ResponseInterface
    {
        $response = new Response(403);
        $response->getBody()->write(json_encode(['error' => 'Forbidden']));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function denyResponse(int $status): ResponseInterface
    {
        $response = new Response($status);
        $message = $status === 401 ? 'Authentication required' : 'Forbidden';
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withHeader('Content-Type', 'application/json');
    }

    private function streamFile($request, array $fileData): ResponseInterface
    {
        $fullPath = $fileData['fullPath'];
        $size = filesize($fullPath);
        $rangeHeader = $request->getHeaderLine('Range');

        $response = new Response();
        $response = $response->withHeader('Content-Type', $fileData['mimetype']);
        $response = $response->withHeader('Accept-Ranges', 'bytes');

        if ($rangeHeader) {
            [$start, $end] = $this->parseRange($rangeHeader, $size);
            if ($start === null || $end === null) {
                return $response->withStatus(416);
            }

            $length = $end - $start + 1;
            $stream = fopen($fullPath, 'rb');
            fseek($stream, $start);
            $body = (new StreamFactory())->createStream();
            $body->write(stream_get_contents($stream, $length));
            fclose($stream);

            return $response
                ->withStatus(206)
                ->withHeader('Content-Range', sprintf('bytes %d-%d/%d', $start, $end, $size))
                ->withHeader('Content-Length', (string)$length)
                ->withBody($body);
        }

        $stream = (new StreamFactory())->createStreamFromFile($fullPath, 'rb');
        return $response
            ->withHeader('Content-Length', (string)$size)
            ->withBody($stream);
    }

    private function parseRange(string $header, int $size): array
    {
        if (!preg_match('/bytes=(\d*)-(\d*)/', $header, $matches)) {
            return [null, null];
        }

        $start = $matches[1] === '' ? null : (int)$matches[1];
        $end = $matches[2] === '' ? null : (int)$matches[2];

        if ($start === null && $end !== null) {
            $start = max(0, $size - $end);
            $end = $size - 1;
        } elseif ($start !== null && $end === null) {
            $end = $size - 1;
        }

        if ($start === null || $start > $end || $end >= $size) {
            return [null, null];
        }

        return [$start, $end];
    }

    /**
     * API helper: fetch a file by its `web_site_file.path` and return its content as-is.
     */
    public function getWebSiteFileByPath(ServerRequestInterface $request, string $path): ?ResponseInterface
    {
        $claims = $request->getAttribute('jwt');

        $userId = self::getUserId($request);

        $fileEntity = $this->fileRepository->findByFilePath($userId, $path);
        if ($fileEntity === null) {
            return null;
        }

        $denied = $this->resourceAccessService->getDeniedStatus($fileEntity->getAclId(), $claims);
        if ($denied !== null) {
            return $this->denyResponse($denied);
        }

        $fullPath = rtrim($this->filesRoot, '/') . '/' . ltrim($path, '/');
        if (!file_exists($fullPath) || !is_readable($fullPath)) {
            return null;
        }

        $mimetype = $fileEntity->getMimetype();

        // Stream the response to support both text and binary files.
        $stream = (new StreamFactory())->createStreamFromFile($fullPath, 'rb');
        $response = new Response();
        return $response
            ->withHeader('Content-Type', $mimetype)
            ->withHeader('Content-Length', (string)filesize($fullPath))
            ->withBody($stream);
    }
}
