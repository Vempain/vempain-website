<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use DateTimeInterface;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_users')]
class WebSiteUser
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'id', type: 'bigint')]
    private ?int $id = null;

    #[ORM\Column(name: 'username', type: 'string', length: 255)]
    private string $username;

    #[ORM\Column(name: 'password_hash', type: 'string', length: 255)]
    private string $passwordHash;

    #[ORM\Column(name: 'creator', type: 'bigint')]
    private int $creator;

    #[ORM\Column(name: 'created', type: 'datetime')]
    private DateTimeInterface $created;

    #[ORM\Column(name: 'modifier', type: 'bigint', nullable: true)]
    private ?int $modifier = null;

    #[ORM\Column(name: 'modified', type: 'datetime', nullable: true)]
    private ?DateTimeInterface $modified = null;

    #[ORM\Column(name: 'global_permission', type: 'boolean', options: ['default' => false])]
    private bool $globalPermission = false;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;
        return $this;
    }

    public function getPasswordHash(): string
    {
        return $this->passwordHash;
    }

    public function setPasswordHash(string $passwordHash): self
    {
        $this->passwordHash = $passwordHash;
        return $this;
    }

    public function getCreator(): int
    {
        return $this->creator;
    }

    public function setCreator(int $creator): self
    {
        $this->creator = $creator;
        return $this;
    }

    public function getCreated(): DateTimeInterface
    {
        return $this->created;
    }

    public function setCreated(DateTimeInterface $created): self
    {
        $this->created = $created;
        return $this;
    }

    public function getModifier(): ?int
    {
        return $this->modifier;
    }

    public function setModifier(?int $modifier): self
    {
        $this->modifier = $modifier;
        return $this;
    }

    public function getModified(): ?DateTimeInterface
    {
        return $this->modified;
    }

    public function setModified(?DateTimeInterface $modified): self
    {
        $this->modified = $modified;
        return $this;
    }

    public function hasGlobalPermission(): bool
    {
        return $this->globalPermission;
    }

    public function setGlobalPermission(bool $globalPermission): self
    {
        $this->globalPermission = $globalPermission;
        return $this;
    }
}
