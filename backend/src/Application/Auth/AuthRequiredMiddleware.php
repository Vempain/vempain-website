<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Route-level middleware that requires a valid JWT to be present (attached by JwtMiddleware).
 * If no JWT claims are attached to the request, return 401 Unauthorized.
 */
class AuthRequiredMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $claims = $request->getAttribute('jwt');
        if ($claims === null) {
            $response = new Response(401);
            $response->getBody()->write(json_encode(['error' => 'Unauthorized']));
            return $response->withHeader('Content-Type', 'application/json');
        }

        // JWT exists (previously validated by JwtMiddleware) — proceed
        return $handler->handle($request);
    }
}
