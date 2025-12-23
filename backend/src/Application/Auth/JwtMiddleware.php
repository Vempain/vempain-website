<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class JwtMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly JwtService $jwtService)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = $request->getUri()->getPath();

        if ($path === '/api/login' || $path === '/api/logout') {
            return $handler->handle($request);
        }

        // Robust detection of API and public API segments — handle duplicate prefixes like /api/api/public
        // Match '/api/public' as a path segment (either end or followed by '/').
        $isPublicApi = preg_match('#(^|/)api/public(/|$)#', $path) === 1;
        $hasApiSegment = preg_match('#(^|/)api(/|$)#', $path) === 1;
        // NOTE: do not enforce auth here; resource layer decides based on ACL.

        $token = $this->extractToken($request);
        $claims = null;
        if ($token !== null) {
            try {
                // Try to validate token; if invalid, swallow error and treat as unauthenticated.
                $claims = $this->jwtService->validate($token);
            } catch (\Throwable) {
                // Invalid token — do not block the request here. Leave $claims as null.
                $claims = null;
            }
        }

        if ($claims !== null) {
            $request = $request->withAttribute('jwt', $claims);
        }

        $response = $handler->handle($request);

        if ($claims !== null) {
            $newToken = $this->jwtService->refreshToken($claims);
            $response = $response->withHeader('X-Auth-Token', $newToken);
            $response = $this->setAuthCookie($response, $newToken);
        }

        return $response;
    }

    private function extractToken(ServerRequestInterface $request): ?string
    {
        $authorizationHeader = $request->getHeaderLine('Authorization');
        if ($authorizationHeader !== '') {
            $parts = explode(' ', $authorizationHeader);
            if (count($parts) === 2 && strcasecmp($parts[0], 'Bearer') === 0) {
                return $parts[1];
            }
        }

        $cookies = $request->getCookieParams();
        if (isset($cookies['jwt'])) {
            return $cookies['jwt'];
        }

        return null;
    }

    private function setAuthCookie(ResponseInterface $response, string $token): ResponseInterface
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

        return $response->withAddedHeader('Set-Cookie', implode('; ', $cookieParts));
    }
}
