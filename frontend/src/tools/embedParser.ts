import type {PageEmbed} from '../models/PageEmbed.ts';

/**
 * Parses embed tags from a page body string and returns an array of PageEmbed objects.
 * Supports: gallery, image, hero, collapse, carousel embed types.
 *
 * Handles both literal HTML comments (<!--vps:embed:…-->) and HTML-entity-encoded
 * variants (&lt;!--vps:embed:…--&gt;) that may appear after server-side eval/cache.
 */
export function parseEmbeds(body: string): PageEmbed[] {
    // Pattern 1: literal HTML comment  <!--vps:embed:type:payload-->
    const literalPattern = /<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s>]+)\s*-->/ig;
    // Pattern 2: entity-encoded         &lt;!--vps:embed:type:payload--&gt;
    const encodedPattern = /&lt;!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s&]+)\s*--&gt;/ig;

    const matchesWithIndex: Array<{embed: PageEmbed; index: number}> = [];

    for (const pattern of [literalPattern, encodedPattern]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const type = (m.groups?.type ?? '').toLowerCase();
            const payload = m.groups?.payload ?? '';
            const matchIndex = m.index;

            if (type === 'gallery' && /^\d+$/.test(payload)) {
                matchesWithIndex.push({embed: {type: 'gallery', embedId: Number(payload), placeholder: m[0]}, index: matchIndex});
            } else if (type === 'image' && /^\d+$/.test(payload)) {
                matchesWithIndex.push({embed: {type: 'image', embedId: Number(payload), placeholder: m[0]}, index: matchIndex});
            } else if (type === 'hero' && /^\d+$/.test(payload)) {
                matchesWithIndex.push({embed: {type: 'hero', embedId: Number(payload), placeholder: m[0]}, index: matchIndex});
            } else if (type === 'collapse' && /^\d+$/.test(payload)) {
                matchesWithIndex.push({embed: {type: 'collapse', embedId: Number(payload), placeholder: m[0]}, index: matchIndex});
            } else if (type === 'carousel') {
                const parts = payload.split(':');
                if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
                    matchesWithIndex.push({
                        embed: {
                            type: 'carousel',
                            embedId: Number(parts[0]),
                            placeholder: m[0],
                            autoplay: parts[1].toLowerCase() === 'true',
                            dotDuration: parts[2].toLowerCase() === 'true',
                            speed: parseInt(parts[3], 10) || 500,
                        },
                        index: matchIndex,
                    });
                }
            }
        }
    }

    // Sort by capture position so cursor-based replacement in PageView works correctly
    matchesWithIndex.sort((a, b) => a.index - b.index);

    return matchesWithIndex.map(({embed}) => embed);
}
