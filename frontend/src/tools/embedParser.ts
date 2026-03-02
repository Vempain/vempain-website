import type {EmbedItem, PageEmbed} from '../models/PageEmbed.ts';

/**
 * Try to parse a JSON array of {title,body} items from the given string.
 * Returns the parsed array on success, or null on failure.
 */
function tryParseItemsJson(json: string): EmbedItem[] | null {
    try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed) && parsed.every(
            (item: unknown) =>
                typeof item === 'object' && item !== null &&
                'title' in item && 'body' in item
        )) {
            return parsed as EmbedItem[];
        }
    } catch {
        // not valid JSON
    }
    return null;
}

/**
 * Parses embed tags from a page body string and returns an array of PageEmbed objects.
 * Supports: gallery, image, hero, collapse, carousel embed types.
 *
 * Collapse and carousel use inline JSON array payloads:
 *   <!--vps:embed:collapse:[{"title":"…","body":"…"},…]-->
 *   <!--vps:embed:carousel:[{"title":"…","body":"…"},…]:true:true:800-->
 *
 * Handles both literal HTML comments (<!--vps:embed:…-->) and HTML-entity-encoded
 * variants (&lt;!--vps:embed:…--&gt;) that may appear after server-side eval/cache.
 */
export function parseEmbeds(body: string): PageEmbed[] {
    const matchesWithIndex: Array<{ embed: PageEmbed; index: number }> = [];

    // --- Pattern pairs: [literal, entity-encoded] ---

    // Simple types (gallery, image, hero): payload is always a numeric ID
    const simpleLiteral = /<!--\s*vps:embed:(?<type>gallery|image|hero):(?<id>\d+)\s*-->/ig;
    const simpleEncoded = /&lt;!--\s*vps:embed:(?<type>gallery|image|hero):(?<id>\d+)\s*--&gt;/ig;

    for (const pattern of [simpleLiteral, simpleEncoded]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const type = (m.groups?.type ?? '').toLowerCase();
            const id = Number(m.groups?.id);
            matchesWithIndex.push({
                embed: {type, embedId: id, placeholder: m[0]},
                index: m.index,
            });
        }
    }

    // Collapse: payload is a JSON array
    const collapseLiteral = /<!--\s*vps:embed:collapse:(\[[\s\S]*?\])\s*-->/ig;
    const collapseEncoded = /&lt;!--\s*vps:embed:collapse:(\[[\s\S]*?\])\s*--&gt;/ig;

    for (const pattern of [collapseLiteral, collapseEncoded]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const jsonStr = m[1];
            const items = tryParseItemsJson(jsonStr);
            if (items) {
                matchesWithIndex.push({
                    embed: {type: 'collapse', embedId: 0, placeholder: m[0], items},
                    index: m.index,
                });
            }
        }
    }

    // Carousel: payload is [JSON]:<autoplay>:<dotDuration>:<speed>
    // New JSON format: <!--vps:embed:carousel:[…]:true:true:800-->
    const carouselJsonLiteral = /<!--\s*vps:embed:carousel:(\[[\s\S]*?\]):([^:]+):([^:]+):(\d+)\s*-->/ig;
    const carouselJsonEncoded = /&lt;!--\s*vps:embed:carousel:(\[[\s\S]*?\]):([^:]+):([^:]+):(\d+)\s*--&gt;/ig;

    for (const pattern of [carouselJsonLiteral, carouselJsonEncoded]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const jsonStr = m[1];
            const items = tryParseItemsJson(jsonStr);
            if (items) {
                matchesWithIndex.push({
                    embed: {
                        type: 'carousel',
                        embedId: 0,
                        placeholder: m[0],
                        items,
                        autoplay: m[2].toLowerCase() === 'true',
                        dotDuration: m[3].toLowerCase() === 'true',
                        speed: parseInt(m[4], 10) || 500,
                    },
                    index: m.index,
                });
            }
        }
    }


    // Sort by capture position so cursor-based replacement in PageView works correctly
    matchesWithIndex.sort((a, b) => a.index - b.index);

    // Deduplicate overlapping matches (JSON patterns may re-match what numeric already captured)
    const seen = new Set<number>();
    const deduped: Array<{ embed: PageEmbed; index: number }> = [];
    for (const entry of matchesWithIndex) {
        if (!seen.has(entry.index)) {
            seen.add(entry.index);
            deduped.push(entry);
        }
    }

    return deduped.map(({embed}) => embed);
}
