<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Vempain\VempainWebsite\Domain\Repository\WebSiteJwtTokenRepository;

class JwtService
{
    public function __construct(
        private readonly WebSiteJwtTokenRepository $tokenRepository,
        private readonly string $secret = '',
        private readonly int $ttl = 1200
    ) {
    }

    public function getCookieAttributes(): array
    {
        return [
            'secure' => !empty($_ENV['COOKIE_SECURE']) && $_ENV['COOKIE_SECURE'] === 'true',
            'domain' => $_ENV['COOKIE_DOMAIN'] ?? null,
        ];
    }

    public function refreshToken(array $claims): string
    {
        return $this->issueToken($claims['sub'], $claims['username']);
    }

    public function issueToken(int $userId, string $username): string
    {
        $secret = $this->secret ?: ($_ENV['JWT_SECRET'] ?? 'secret');
        $ttl = $this->ttl ?: (int)($_ENV['JWT_TTL_SECONDS'] ?? 1200);
        $issuedAt = time();
        $payload = [
            'sub' => $userId,
            'username' => $username,
            'iat' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];
        $token = JWT::encode($payload, $secret, 'HS256');

        $this->tokenRepository->storeToken($userId, $token, $payload['exp']);

        return $token;
    }

    public function validate(string $token): array
    {
        $secret = $this->secret ?: ($_ENV['JWT_SECRET'] ?? 'secret');
        $claims = (array)JWT::decode($token, new Key($secret, 'HS256'));
        $claims['token'] = $token;
        return $claims;
    }
}
