import type {EmbedItem, LastEmbedType, PageEmbed} from '../models/PageEmbed.ts';

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
 * Supports: gallery, image, hero, music, gps_timeseries, collapse, carousel embed types.
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

    // Simple numeric types
    const simpleLiteral = /<!--\s*vps:embed:(?<type>gallery|image|hero|video|audio):(?<id>\d+)\s*-->/ig;
    const simpleEncoded = /&lt;!--\s*vps:embed:(?<type>gallery|image|hero|video|audio):(?<id>\d+)\s*--&gt;/ig;

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

    // Dataset embeds keyed by identifier
    const datasetLiteral = /<!--\s*vps:embed:(?<type>music|gps_timeseries):(?<identifier>[a-z][a-z0-9_]*)\s*-->/ig;
    const datasetEncoded = /&lt;!--\s*vps:embed:(?<type>music|gps_timeseries):(?<identifier>[a-z][a-z0-9_]*)\s*--&gt;/ig;

    for (const pattern of [datasetLiteral, datasetEncoded]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const type = (m.groups?.type ?? '').toLowerCase();
            const identifier = (m.groups?.identifier ?? '').trim();
            if (identifier !== '') {
                matchesWithIndex.push({
                    embed: {type, identifier, placeholder: m[0]},
                    index: m.index,
                });
            }
        }
    }

    // YouTube URL embed
    const youtubeLiteral = /<!--\s*vps:embed:youtube:(?<url>[\s\S]*?)\s*-->/ig;
    const youtubeEncoded = /&lt;!--\s*vps:embed:youtube:(?<url>[\s\S]*?)\s*--&gt;/ig;

    for (const pattern of [youtubeLiteral, youtubeEncoded]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const youtubeUrl = (m.groups?.url ?? '').trim();
            if (youtubeUrl !== '') {
                matchesWithIndex.push({
                    embed: {type: 'youtube', youtubeUrl, placeholder: m[0]},
                    index: m.index,
                });
            }
        }
    }

    // Last-items embed
    const lastLiteral = /<!--\s*vps:embed:last:(?<lastType>pages|galleries|images|videos|audio|documents):(?<count>\d+)\s*-->/ig;
    const lastEncoded = /&lt;!--\s*vps:embed:last:(?<lastType>pages|galleries|images|videos|audio|documents):(?<count>\d+)\s*--&gt;/ig;

    for (const pattern of [lastLiteral, lastEncoded]) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(body)) !== null) {
            const lastType = (m.groups?.lastType ?? '').toLowerCase() as LastEmbedType;
            const count = Number(m.groups?.count ?? '0');
            if (count > 0) {
                matchesWithIndex.push({
                    embed: {type: 'last', lastType, count, placeholder: m[0]},
                    index: m.index,
                });
            }
        }
    }

    // Collapse: payload is a JSON array
    const collapseLiteral = /<!--\s*vps:embed:collapse:(\[[\s\S]*?])\s*-->/ig;
    const collapseEncoded = /&lt;!--\s*vps:embed:collapse:(\[[\s\S]*?])\s*--&gt;/ig;

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
    const carouselJsonLiteral = /<!--\s*vps:embed:carousel:(\[[\s\S]*?]):([^:]+):([^:]+):(\d+)\s*-->/ig;
    const carouselJsonEncoded = /&lt;!--\s*vps:embed:carousel:(\[[\s\S]*?]):([^:]+):([^:]+):(\d+)\s*--&gt;/ig;

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

    // Deduplicate only exact duplicate capture starts and placeholders
    const seen = new Set<string>();
    const deduped: Array<{ embed: PageEmbed; index: number }> = [];
    for (const entry of matchesWithIndex) {
        const dedupeKey = `${entry.index}:${entry.embed.placeholder ?? ''}`;
        if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            deduped.push(entry);
        }
    }

    return deduped.map(({embed}) => embed);
}
