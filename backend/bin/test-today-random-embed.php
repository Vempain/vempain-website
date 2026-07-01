#!/usr/bin/env php
<?php

declare(strict_types=1);

use Vempain\VempainWebsite\Application\Service\TodayRandomEmbedService;
use Vempain\VempainWebsite\Domain\Repository\WebSiteFileRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;

require __DIR__ . '/../vendor/autoload.php';

$fileRepository = new class extends WebSiteFileRepository {
    public function __construct()
    {
    }

    public function findRandomImagesByCurrentMonthDay(int $count): array
    {
        return [
            ['id' => 1, 'title' => 'Sunrise', 'file_path' => 'images/sunrise.jpg', 'published' => '2024-08-10T09:00:00'],
        ];
    }
};

$pageRepository = new class extends WebSitePageRepository {
    public function __construct()
    {
    }

    public function findRandomPublishedByCurrentMonthDay(int $count): array
    {
        return [
            ['id' => 10, 'title' => 'Trip diary', 'header' => 'Intro', 'file_path' => 'trips/diary', 'published' => '2024-08-10T09:00:00'],
        ];
    }
};

$service = new TodayRandomEmbedService($fileRepository, $pageRepository);

$literalInput = '<p>Intro</p><!--vps:embed:today_random:{"title":"On this day"}--><p>Tail</p>';
$literalOutput = $service->injectTodayRandomData($literalInput);
assert(str_contains($literalOutput, '"title":"On this day"'));
assert(str_contains($literalOutput, '"images":[{"id":1,"title":"Sunrise","file_path":"images/sunrise.jpg","published":"2024-08-10T09:00:00"}]'));
assert(str_contains($literalOutput, '"pages":[{"id":10,"title":"Trip diary","header":"Intro","file_path":"trips/diary","published":"2024-08-10T09:00:00"}]'));

$encodedInput = '&lt;!--vps:embed:today_random:{"columns":3}--&gt;';
$encodedOutput = $service->injectTodayRandomData($encodedInput);
assert(str_contains($encodedOutput, '&lt;!--vps:embed:today_random:'));
assert(str_contains($encodedOutput, '"columns":3'));
assert(str_contains($encodedOutput, '"images":[{"id":1,"title":"Sunrise","file_path":"images/sunrise.jpg","published":"2024-08-10T09:00:00"}]'));
assert(str_contains($encodedOutput, '"pages":[{"id":10,"title":"Trip diary","header":"Intro","file_path":"trips/diary","published":"2024-08-10T09:00:00"}]'));

echo "TodayRandomEmbedService tests passed\n";
