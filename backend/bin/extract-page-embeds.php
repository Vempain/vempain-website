#!/usr/bin/env php
<?php

declare(strict_types=1);

use Doctrine\ORM\EntityManagerInterface;
use Vempain\VempainWebsite\Application\Service\LegacyEmbedParser;
use Vempain\VempainWebsite\Domain\Entity\WebSitePage;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../src/bootstrap.php';
$container = $app->getContainer();

/** @var EntityManagerInterface $entityManager */
$entityManager = $container->get(EntityManagerInterface::class);
/** @var LegacyEmbedParser $parser */
$parser = $container->get(LegacyEmbedParser::class);

$pageRepository = $entityManager->getRepository(WebSitePage::class);
$pages = $pageRepository->findAll();

$updated = 0;
$total = count($pages);

foreach ($pages as $page) {
    $embeds = $parser->parse($page->getBody());

    if ($embeds === $page->getEmbeds()) {
        continue;
    }

    $page->setEmbeds($embeds ?: null);
    $entityManager->persist($page);
    ++$updated;
}

if ($updated > 0) {
    $entityManager->flush();
}

echo sprintf("Processed %d pages, updated %d embeds entries\n", $total, $updated);

