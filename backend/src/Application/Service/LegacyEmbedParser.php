<?php

namespace Vempain\VempainWebsite\Application\Service;

class LegacyEmbedParser
{
    private const PATTERN_PLACEHOLDER = '/<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s>]+)\s*-->/i';
    private const PATTERN_SHOWGALLERY = '/showGallery\s*\(\s*(?<id>\d+)\s*\)/i';

    /**
     * @return array<int, array<string, mixed>>
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

                if (in_array($type, ['gallery', 'image', 'hero', 'collapse'], true) && is_numeric($payload)) {
                    $id = (int)$payload;
                    $key = "{$type}:{$id}";
                    if (!isset($seen[$key])) {
                        $embeds[] = [
                            'type' => $type,
                            'embedId' => $id,
                            'placeholder' => $match[0],
                        ];
                        $seen[$key] = true;
                    }
                } elseif ($type === 'carousel') {
                    $parts = explode(':', $payload);
                    if (count($parts) >= 4 && is_numeric($parts[0])) {
                        $id = (int)$parts[0];
                        $key = "carousel:{$id}";
                        if (!isset($seen[$key])) {
                            $embeds[] = [
                                'type' => 'carousel',
                                'embedId' => $id,
                                'autoplay' => strtolower($parts[1]) === 'true',
                                'dotDuration' => strtolower($parts[2]) === 'true',
                                'speed' => $parts[3] !== '' ? (int)$parts[3] : 500,
                                'placeholder' => $match[0],
                            ];
                            $seen[$key] = true;
                        }
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
                        'embedId' => $id,
                        'placeholder' => $placeholder,
                    ];
                    $seen[$key] = true;
                }
            }
        }

        return $embeds;
    }
}
