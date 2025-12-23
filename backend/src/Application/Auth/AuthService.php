<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Symfony\Component\PasswordHasher\PasswordHasherInterface;
use Vempain\VempainWebsite\Domain\Repository\UserRepository;

class AuthService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly JwtService $jwtService,
        private readonly PasswordHasherInterface $passwordHasher
    ) {
    }

    public function authenticate(string $username, string $password): ?array
    {
        $user = $this->userRepository->findOneByUsername($username);

        if (!$user) {
            return null;
        }

        if (!$this->passwordHasher->verify($user->getPasswordHash(), $password)) {
            return null;
        }

        $token = $this->jwtService->issueToken($user->getId(), $user->getUsername());

        return [
            'token' => $token,
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
        ];
    }
}
