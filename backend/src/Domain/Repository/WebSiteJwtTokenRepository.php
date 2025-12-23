<?php

namespace Vempain\VempainWebsite\Domain\Repository;

use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Domain\Entity\WebSiteJwtToken;

class WebSiteJwtTokenRepository
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    public function storeToken(int $userId, string $token, int $expiresAt): void
    {
        $entity = new WebSiteJwtToken();
        $entity->setUserId($userId);
        $entity->setToken($token);
        $entity->setCreator(1);
        $entity->setCreated(new DateTimeImmutable());
        $entity->setExpiresAt((new DateTimeImmutable())->setTimestamp($expiresAt));

        $this->entityManager->persist($entity);
        $this->entityManager->flush();
    }

    public function findValidToken(string $token): ?WebSiteJwtToken
    {
        /** @var WebSiteJwtToken|null $entity */
        $entity = $this->entityManager
            ->getRepository(WebSiteJwtToken::class)
            ->findOneBy(['token' => $token]);

        if ($entity === null) {
            return null;
        }

        return $entity->getExpiresAt() > new DateTimeImmutable() ? $entity : null;
    }
}
