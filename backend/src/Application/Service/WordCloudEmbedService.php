<?php

namespace Vempain\VempainWebsite\Application\Service;

use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;

class WordCloudEmbedService
{
    private const int DEFAULT_LIMIT = 100;
    private const PATTERN_LITERAL = '/<!--\s*vps:embed:word_cloud:(?<payload>\{[\s\S]*?})\s*-->/i';
    private const PATTERN_ENCODED = '/&lt;!--\s*vps:embed:word_cloud:(?<payload>\{[\s\S]*?})\s*--&gt;/i';

    public function __construct(
        private readonly WebSiteSubjectRepository $subjectRepository,
    ) {
    }

    public function injectTopTagData(string $body): string
    {
        if ($body === '') {
            return $body;
        }

        $tags = $this->subjectRepository->findMostUsedTags(self::DEFAULT_LIMIT);

        $body = self::injectWordCloudData($body, $tags, self::PATTERN_LITERAL, false);
        return self::injectWordCloudData($body, $tags, self::PATTERN_ENCODED, true);
    }

    /**
     * @param array<int, array{text:string, value:int}> $tagData
     */
    private static function injectWordCloudData(string $body, array $tagData, string $pattern, bool $encoded): string
    {
        $result = preg_replace_callback(
            $pattern,
            static function (array $matches) use ($tagData, $encoded): string {
                $payload = $matches['payload'] ?? '{}';
                $options = self::parseOptions($payload);
                $options['data'] = $tagData;
                $json = json_encode($options, JSON_UNESCAPED_SLASHES);
                if ($json === false) {
                    return $matches[0];
                }

                if ($encoded) {
                    return sprintf('&lt;!--vps:embed:word_cloud:%s--&gt;', $json);
                }

                return sprintf('<!--vps:embed:word_cloud:%s-->', $json);
            },
            $body,
        );

        return $result ?? $body;
    }

    /**
     * @return array<string, mixed>
     */
    private static function parseOptions(string $payload): array
    {
        try {
            $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($decoded)) {
                return [];
            }

            unset($decoded['data']);
            return $decoded;
        } catch (\JsonException) {
            return [];
        }
    }
}
