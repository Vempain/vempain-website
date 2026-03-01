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

    const matches: PageEmbed[] = [];

    for (const pattern of [literalPattern, encodedPattern]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const type = (m.groups?.type ?? '').toLowerCase();
            const payload = m.groups?.payload ?? '';

            if (type === 'gallery' && /^\d+$/.test(payload)) {
                matches.push({type: 'gallery', embedId: Number(payload), placeholder: m[0]});
            } else if (type === 'image' && /^\d+$/.test(payload)) {
                matches.push({type: 'image', embedId: Number(payload), placeholder: m[0]});
            } else if (type === 'hero' && /^\d+$/.test(payload)) {
                matches.push({type: 'hero', embedId: Number(payload), placeholder: m[0]});
            } else if (type === 'collapse' && /^\d+$/.test(payload)) {
                matches.push({type: 'collapse', embedId: Number(payload), placeholder: m[0]});
            } else if (type === 'carousel') {
                const parts = payload.split(':');
                if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
                    matches.push({
                        type: 'carousel',
                        embedId: Number(parts[0]),
                        placeholder: m[0],
                        autoplay: parts[1].toLowerCase() === 'true',
                        dotDuration: parts[2].toLowerCase() === 'true',
                        speed: parseInt(parts[3], 10) || 500,
                    });
                }
            }
        }
    }

    // Sort by position in body so cursor-based replacement in PageView works correctly
    matches.sort((a, b) => body.indexOf(a.placeholder!) - body.indexOf(b.placeholder!));

    return matches;
}
