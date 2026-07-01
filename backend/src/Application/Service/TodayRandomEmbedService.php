<?php

namespace Vempain\VempainWebsite\Application\Service;

use Vempain\VempainWebsite\Domain\Repository\WebSiteFileRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;

class TodayRandomEmbedService
{
    private const int IMAGE_LIMIT = 5;
    private const int PAGE_LIMIT = 2;
    private const PATTERN_LITERAL = '/<!--\s*vps:embed:today_random:(?<payload>\{[\s\S]*?})\s*-->/i';
    private const PATTERN_ENCODED = '/&lt;!--\s*vps:embed:today_random:(?<payload>\{[\s\S]*?})\s*--&gt;/i';

    public function __construct(
        private readonly WebSiteFileRepository $fileRepository,
        private readonly WebSitePageRepository $pageRepository,
    ) {
    }

    public function injectTodayRandomData(string $body): string
    {
        if ($body === '') {
            return $body;
        }

        $images = $this->fileRepository->findRandomImagesByCurrentMonthDay(self::IMAGE_LIMIT);
        $pages = $this->pageRepository->findRandomPublishedByCurrentMonthDay(self::PAGE_LIMIT);

        $body = self::injectPayload($body, $images, $pages, self::PATTERN_LITERAL, false);
        return self::injectPayload($body, $images, $pages, self::PATTERN_ENCODED, true);
    }

    /**
     * @param array<int, array<string, mixed>> $images
     * @param array<int, array<string, mixed>> $pages
     */
    private static function injectPayload(
        string $body,
        array $images,
        array $pages,
        string $pattern,
        bool $encoded
    ): string {
        $result = preg_replace_callback(
            $pattern,
            static function (array $matches) use ($images, $pages, $encoded): string {
                $payload = $matches['payload'] ?? '{}';
                $options = self::parseOptions($payload);
                $options['images'] = $images;
                $options['pages'] = $pages;
                $json = json_encode($options, JSON_UNESCAPED_SLASHES);
                if ($json === false) {
                    return $matches[0];
                }

                if ($encoded) {
                    return sprintf('&lt;!--vps:embed:today_random:%s--&gt;', $json);
                }

                return sprintf('<!--vps:embed:today_random:%s-->', $json);
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

            unset($decoded['images'], $decoded['pages']);
            return $decoded;
        } catch (\JsonException) {
            return [];
        }
    }
}
