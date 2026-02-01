<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Firebase\JWT\ExpiredException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

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
        $this->logger->debug("Extracting token from request for path: $path");

        $token = $this->extractToken($request);
        $claims = null;
        $tokenExpired = false;

        if ($token !== null) {
            $this->logger->debug("Token is not null, validating");
            try {
                // Try to validate token; if invalid, swallow error and treat as unauthenticated.
                $claims = $this->jwtService->validate($token);
            } catch (ExpiredException $e) {
                // Token is expired - we need to return 401 and clear the cookie
                $this->logger->debug("Token is expired", ['error' => $e->getMessage()]);
                $tokenExpired = true;
            } catch (\Throwable $e) {
                // Other invalid token errors — do not block the request here. Leave $claims as null.
                $this->logger->debug("Token validation failed", ['error' => $e->getMessage()]);
                $claims = null;
            }
        }

        // If token was present but expired, return 401 with cookie clearing
        if ($tokenExpired) {
            $this->logger->debug("Returning 401 for expired token");
            $response = new Response(401);
            $response->getBody()->write(json_encode([
                'error' => 'Session expired',
                'code' => 'SESSION_EXPIRED'
            ]));
            $response = $response->withHeader('Content-Type', 'application/json');
            return $this->clearAuthCookie($response);
        }

        if ($claims !== null) {
            $this->logger->debug("Adding claims to request attributes", ['claims' => $claims]);
            $request = $request->withAttribute('jwt', $claims);
        }

        $response = $handler->handle($request);

        if ($claims !== null) {
            $this->logger->debug("Adding refreshed token to response headers and cookies");
            $newToken = $this->jwtService->refreshToken($claims);
            $response = $response->withHeader('X-Auth-Token', $newToken);
            $response = $this->setAuthCookie($response, $newToken);
        }

        return $response;
    }

    private function extractToken(ServerRequestInterface $request): ?string
    {
        $this->logger->debug("Extracting JWT from request", ['request' => $request]);

        $authorizationHeader = $request->getHeaderLine('Authorization');
        if ($authorizationHeader !== '') {
            $this->logger->debug("Found authorization header", ['authorizationHeader' => $authorizationHeader]);
            $parts = explode(' ', $authorizationHeader);

            if (count($parts) === 2 && strcasecmp($parts[0], 'Bearer') === 0) {
                return $parts[1];
            }
        }

        $this->logger->debug("Looking for cookie 'jwt'");
        $cookies = $request->getCookieParams();
        $this->logger->debug("Got cookies", ['cookies' => $cookies]);

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

    private function clearAuthCookie(ResponseInterface $response): ResponseInterface
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

        return $response->withAddedHeader('Set-Cookie', implode('; ', $cookieParts));
    }
}
