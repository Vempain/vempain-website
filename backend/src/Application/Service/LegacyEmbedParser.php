<?php

namespace Vempain\VempainWebsite\Application\Service;

class LegacyEmbedParser
{
    private const PATTERN_PLACEHOLDER = '/<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s>]+)\s*-->/i';
    private const PATTERN_SHOWGALLERY = '/showGallery\s*\(\s*(?<id>\d+)\s*\)/i';

    /**
     * @return array<int, array<string, int|string>>
     */
    public function parse(?string $body): array
    {
        if ($body === null || $body === '') {
            return [];
        }

        $embeds = [];
        $seen = [];

        // 1) parse explicit placeholders first
        preg_match_all(self::PATTERN_PLACEHOLDER, $body, $matches, PREG_SET_ORDER);
        if ($matches !== []) {
            foreach ($matches as $match) {
                $type = strtolower($match['type']);
                $payload = $match['payload'];

                if ($type === 'gallery' && is_numeric($payload)) {
                    $id = (int)$payload;
                    $key = "gallery:{$id}";
                    if (!isset($seen[$key])) {
                        $embeds[] = [
                            'type' => 'gallery',
                            'galleryId' => $id,
                            'placeholder' => $match[0],
                        ];
                        $seen[$key] = true;
                    }
                }
            }
        }

        // 2) also detect legacy showGallery(123) calls in raw body
        preg_match_all(self::PATTERN_SHOWGALLERY, $body, $sgMatches, PREG_SET_ORDER);
        if ($sgMatches !== []) {
            foreach ($sgMatches as $m) {
                $id = (int)$m['id'];
                $key = "gallery:{$id}";
                if (!isset($seen[$key])) {
                    $placeholder = "<!--vps:embed:gallery:{$id}-->";
                    $embeds[] = [
                        'type' => 'gallery',
                        'galleryId' => $id,
                        'placeholder' => $placeholder,
                    ];
                    $seen[$key] = true;
                }
            }
        }

        return $embeds;
    }
}
