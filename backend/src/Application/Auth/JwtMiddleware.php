<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class JwtMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly LoggerInterface $logger
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $path = $request->getUri()->getPath();

        if ($path === '/api/login' || $path === '/api/logout') {
            return $handler->handle($request);
        }

        // NOTE: do not enforce auth here; resource layer decides based on ACL.
        $this->logger->debug("XXXXXXXXX Extracting token from request for path: $path");

        $token = $this->extractToken($request);
        $claims = null;
        if ($token !== null) {
            $this->logger->debug("XXXXXXXXX Token is not null, validating");
            try {
                // Try to validate token; if invalid, swallow error and treat as unauthenticated.
                $claims = $this->jwtService->validate($token);
            } catch (\Throwable) {
                // Invalid token — do not block the request here. Leave $claims as null.
                $claims = null;
            }
        }

        if ($claims !== null) {
            $this->logger->debug("XXXXXXXXX Adding claims to request attributes", ['claims' => $claims]);
            $request = $request->withAttribute('jwt', $claims);
        }

        $response = $handler->handle($request);

        if ($claims !== null) {
            $this->logger->debug("XXXXXXXXX Adding refreshed token to response headers and cookies");
            $newToken = $this->jwtService->refreshToken($claims);
            $response = $response->withHeader('X-Auth-Token', $newToken);
            $response = $this->setAuthCookie($response, $newToken);
        }

        return $response;
    }

    private function extractToken(ServerRequestInterface $request): ?string
    {
        $this->logger->debug("XXXXXXXXX Extracting JWT from request", ['request' => $request]);

        $authorizationHeader = $request->getHeaderLine('Authorization');
        if ($authorizationHeader !== '') {
            $this->logger->debug("XXXXXXXXX Found authorization header", ['authorizationHeader' => $authorizationHeader]);
            $parts = explode(' ', $authorizationHeader);

            if (count($parts) === 2 && strcasecmp($parts[0], 'Bearer') === 0) {
                return $parts[1];
            }
        }

        $this->logger->debug("XXXXXXXXX Looking for cookie 'jwt'");
        $cookies = $request->getCookieParams();
        $this->logger->debug("XXXXXXXXX Got cookies", ['cookies' => $cookies]);

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
