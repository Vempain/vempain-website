<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_users')]
class User
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(type: 'string', length: 255, unique: true)]
    private string $username;

    #[ORM\Column(name: 'password_hash', type: 'string', length: 255)]
    private string $passwordHash;

    #[ORM\Column(name: 'global_permission', type: 'boolean', length: 255)]
    private bool $globalPermission;

    public function getId(): int
    {
        return $this->id;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function getPasswordHash(): string
    {
        return $this->passwordHash;
    }

    public function getGlobalPermission(): string
    {
        return $this->globalPermission;
    }
}
