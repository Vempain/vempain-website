<?php

namespace Vempain\VempainWebsite\Application\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class CorsMiddleware implements MiddlewareInterface
{
    private const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    private const DEFAULT_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Auth-Token'];
    private const DEFAULT_EXPOSE_HEADERS = ['X-Auth-Token'];

    /**
     * @param string[] $allowedOrigins
     */
    public function __construct(
        private readonly array $allowedOrigins = [],
        private readonly array $allowedMethods = self::DEFAULT_METHODS,
        private readonly array $allowedHeaders = self::DEFAULT_HEADERS,
        private readonly array $exposedHeaders = self::DEFAULT_EXPOSE_HEADERS,
        private readonly int $maxAge = 600,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $origin = $request->getHeaderLine('Origin');
        $allowOrigin = $this->resolveOrigin($origin);

        if ($request->getMethod() === 'OPTIONS') {
            $response = new Response(204);
        } else {
            $response = $handler->handle($request);
        }

        if ($allowOrigin === null) {
            return $response;
        }

        return $this->withCorsHeaders($response, $allowOrigin);
    }

    private function resolveOrigin(string $origin): ?string
    {
        if ($origin === '' || $this->allowedOrigins === []) {
            return null;
        }

        foreach ($this->allowedOrigins as $allowed) {
            if ($allowed === '*') {
                return $origin;
            }

            if (strcasecmp($allowed, $origin) === 0) {
                return $origin;
            }
        }

        return null;
    }

    private function withCorsHeaders(ResponseInterface $response, string $origin): ResponseInterface
    {
        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Allow-Methods', implode(', ', $this->allowedMethods))
            ->withHeader('Access-Control-Allow-Headers', implode(', ', $this->allowedHeaders))
            ->withHeader('Access-Control-Expose-Headers', implode(', ', $this->exposedHeaders))
            ->withHeader('Access-Control-Max-Age', (string)$this->maxAge);
    }
}
