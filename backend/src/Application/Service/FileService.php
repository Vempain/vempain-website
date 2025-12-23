<?php

namespace Vempain\VempainWebsite\Application\Service;

use Laminas\Diactoros\StreamFactory;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Response;
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
        private readonly AclService $aclService,
    ) {
    }

    public function handleFileRequest(ServerRequestInterface $request): ?ResponseInterface
    {
        $path = $request->getUri()->getPath();
        if (!str_starts_with($path, '/file/')) {
            return null;
        }

        $relativePath = ltrim(substr($path, strlen('/file/')), '/');
        $fileData = $this->getFileByPath($relativePath);

        if (!$fileData) {
            return $this->forbiddenResponse();
        }

        $claims = $request->getAttribute('jwt');
        if (!$this->aclService->canAccess($fileData['aclId'], $claims)) {
            return $this->forbiddenResponse();
        }

        return $this->streamFile($request, $fileData);
    }

    private function getFileByPath(string $path): ?array
    {
        $filesystemRelativePath = $path;
        $fileEntity = $this->fileRepository->findByPath($path);

        if (!$fileEntity && str_contains($path, '/.thumb/')) {
            $fallbackPath = preg_replace('#/\.thumb/#', '/', $path, 1);
            $fileEntity = $this->fileRepository->findByPath($fallbackPath);
            if ($fileEntity) {
                $filesystemRelativePath = $path;
            }
        }

        if (!$fileEntity) {
            return null;
        }

        $fullPath = rtrim($this->filesRoot, '/') . '/' . ltrim($filesystemRelativePath, '/');

        if (!file_exists($fullPath) || !is_readable($fullPath)) {
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
}
