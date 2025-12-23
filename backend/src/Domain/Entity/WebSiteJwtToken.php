<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_jwt_token')]
class WebSiteJwtToken
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(name: 'user_id', type: 'bigint')]
    private int $userId;

    #[ORM\Column(type: 'string', length: 512, unique: true)]
    private string $token;

    #[ORM\Column(name: 'creator', type: 'bigint')]
    private int $creator;

    #[ORM\Column(name: 'created', type: 'datetime_immutable')]
    private \DateTimeImmutable $created;

    #[ORM\Column(name: 'expires', type: 'datetime_immutable')]
    private \DateTimeImmutable $expiresAt;

    public function getId(): int
    {
        return $this->id;
    }

    public function getUserId(): int
    {
        return $this->userId;
    }

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function setToken(string $token): void
    {
        $this->token = $token;
    }

    public function getCreator(): int
    {
        return $this->creator;
    }

    public function setCreator(int $creator): void
    {
        $this->creator = $creator;
    }

    public function getCreated(): \DateTimeImmutable
    {
        return $this->created;
    }

    public function setCreated(\DateTimeImmutable $created): void
    {
        $this->created = $created;
    }

    public function getExpiresAt(): \DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(\DateTimeImmutable $expiresAt): void
    {
        $this->expiresAt = $expiresAt;
    }
}
