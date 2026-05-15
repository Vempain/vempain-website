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

        // 1) parse explicit placeholders first; one entry per occurrence so the
        //    frontend can replace every placeholder in document order
        preg_match_all(self::PATTERN_PLACEHOLDER, $body, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $type = strtolower($match['type']);
            $payload = $match['payload'];

            if (in_array($type, ['gallery', 'image', 'hero', 'collapse'], true) && is_numeric($payload)) {
                $embeds[] = [
                    'type' => $type,
                    'embed_id' => (int)$payload,
                    'placeholder' => $match[0],
                ];
            } elseif ($type === 'carousel') {
                $parts = explode(':', $payload);
                if (count($parts) >= 4 && is_numeric($parts[0])) {
                    $embeds[] = [
                        'type' => 'carousel',
                        'embed_id' => (int)$parts[0],
                        'autoplay' => strtolower($parts[1]) === 'true',
                        'dot_duration' => strtolower($parts[2]) === 'true',
                        'speed' => $this->parseCarouselSpeed($parts[3] ?? ''),
                        'placeholder' => $match[0],
                    ];
                }
            }
        }

        // 2) also detect legacy showGallery(123) calls in raw body; one entry per call
        preg_match_all(self::PATTERN_SHOWGALLERY, $body, $sgMatches, PREG_SET_ORDER);
        foreach ($sgMatches as $m) {
            $id = (int)$m['id'];
            $embeds[] = [
                'type' => 'gallery',
                'embed_id' => $id,
                'placeholder' => "<!--vps:embed:gallery:{$id}-->",
            ];
        }

        return $embeds;
    }

    private function parseCarouselSpeed(string $value): int
    {
        return ($value !== '' && is_numeric($value) && (int)$value > 0)
            ? (int)$value
            : 500;
    }
}
