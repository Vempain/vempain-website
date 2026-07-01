#!/usr/bin/env php
<?php

declare(strict_types=1);

use Vempain\VempainWebsite\Application\Service\WordCloudEmbedService;
use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;

require __DIR__ . '/../vendor/autoload.php';

$subjectRepository = new class extends WebSiteSubjectRepository {
    public function __construct()
    {
    }

    public function findMostUsedTags(int $limit = 100): array
    {
        return [
            ['text' => 'nature', 'value' => 12],
            ['text' => 'travel', 'value' => 8],
        ];
    }
};

$service = new WordCloudEmbedService($subjectRepository);

$literalInput = '<p>Intro</p><!--vps:embed:word_cloud:{"shape":"circle"}--><p>Tail</p>';
$literalOutput = $service->injectTopTagData($literalInput);
assert(str_contains($literalOutput, '"shape":"circle"'));
assert(str_contains($literalOutput, '"data":[{"text":"nature","value":12},{"text":"travel","value":8}]'));

$encodedInput = '&lt;!--vps:embed:word_cloud:{"fontSize":[12,48]}--&gt;';
$encodedOutput = $service->injectTopTagData($encodedInput);
assert(str_contains($encodedOutput, '&lt;!--vps:embed:word_cloud:'));
assert(str_contains($encodedOutput, '"fontSize":[12,48]'));
assert(str_contains($encodedOutput, '"data":[{"text":"nature","value":12},{"text":"travel","value":8}]'));

echo "WordCloudEmbedService tests passed\n";
