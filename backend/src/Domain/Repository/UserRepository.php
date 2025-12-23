<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\User;

class UserRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function findOneByUsername(string $username): ?User
    {
        return $this->entityManager
            ->getRepository(User::class)
            ->findOneBy(['username' => $username]);
    }
}
