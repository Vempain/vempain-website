<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Psr\Log\LoggerInterface;
use Vempain\VempainWebsite\Domain\Repository\WebSiteJwtTokenRepository;

class JwtService
{
    public function __construct(
        private readonly WebSiteJwtTokenRepository $tokenRepository,
        private readonly ?string $secret = null,
        private readonly int $ttl = 1200,
        private readonly ?LoggerInterface $logger = null,
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
        $globalPermission = !empty($claims['global_permission']);
        return $this->issueToken($claims['sub'], $claims['username'], $globalPermission);
    }

    public function issueToken(int $userId, string $username, bool $globalPermission): string
    {
        $secret = $this->resolveSecret();

        $this->logger?->debug('Issuing JWT', [
            'secret_length' => strlen($secret),
        ]);

        $ttl = $this->ttl ?: (int)($_ENV['JWT_TTL_SECONDS'] ?? 1200);
        $issuedAt = time();
        $payload = [
            'sub' => $userId,
            'username' => $username,
            'global_permission' => $globalPermission,
            'iat' => $issuedAt,
            'exp' => $issuedAt + $ttl,
        ];
        $token = JWT::encode($payload, $secret, 'HS256');

        $this->tokenRepository->storeToken($userId, $token, $payload['exp']);

        return $token;
    }

    public function validate(string $token): array
    {
        $secret = $this->resolveSecret();
        $claims = (array)JWT::decode($token, new Key($secret, 'HS256'));
        $claims['token'] = $token;
        return $claims;
    }

    private function resolveSecret(): string
    {
        $candidates = [
            $this->secret,
            $_ENV['JWT_SECRET'] ?? null,
            $_SERVER['JWT_SECRET'] ?? null,
            getenv('JWT_SECRET') ?: null,
        ];

        foreach ($candidates as $candidate) {
            $candidate = trim((string)($candidate ?? ''));
            if ($candidate !== '' && $candidate !== 'secret') {
                return $candidate;
            }
        }

        return 'secret';
    }
}
