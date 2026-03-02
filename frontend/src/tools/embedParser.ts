import type {PageEmbed} from '../models/PageEmbed.ts';

/**
 * Parses embed tags from a page body string and returns an array of PageEmbed objects.
 * Supports: gallery, image, hero, collapse, carousel embed types.
 *
 * Handles both literal HTML comments (<!--vps:embed:…-->) and HTML-entity-encoded
 * variants (&lt;!--vps:embed:…--&gt;) that may appear after server-side eval/cache.
 *
 * collapse format:  <!--vps:embed:collapse:[{"title":"…","body":"…"},…]-->
 * carousel format:  <!--vps:embed:carousel:[{"title":"…","body":"…"},…]:autoplay:dotDuration:speed-->
 */

/** Find the index of the closing bracket/brace that balances the first one in `s`. */
function findJsonEndIndex(s: string): number {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (escape) { escape = false; continue; }
        if (c === '\\' && inString) { escape = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (c === '[' || c === '{') depth++;
        else if (c === ']' || c === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/** Decode HTML entities that may appear when an embed tag is entity-encoded. */
function decodePayloadEntities(s: string): string {
    return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/** Type guard for a single embed item. */
function isEmbedItem(item: unknown): item is {title: string; body: string} {
    return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as {title: unknown}).title === 'string' &&
        typeof (item as {body: unknown}).body === 'string'
    );
}

/** Parse a JSON string as an array of {title, body} items; returns null on failure. */
function parseJsonItems(jsonStr: string): Array<{title: string; body: string}> | null {
    try {
        const decoded = decodePayloadEntities(jsonStr);
        const parsed = JSON.parse(decoded) as unknown;
        if (Array.isArray(parsed) && parsed.every(isEmbedItem)) {
            return parsed as Array<{title: string; body: string}>;
        }
    } catch {
        // ignore invalid JSON
    }
    return null;
}

export function parseEmbeds(body: string): PageEmbed[] {
    // Pattern 1: literal HTML comment  <!--vps:embed:type:payload-->
    const literalPattern = /<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>.+?)\s*-->/ig;
    // Pattern 2: entity-encoded         &lt;!--vps:embed:type:payload--&gt;
    const encodedPattern = /&lt;!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>.+?)\s*--&gt;/ig;

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
            } else if (type === 'collapse') {
                const items = parseJsonItems(payload);
                if (items) {
                    matchesWithIndex.push({embed: {type: 'collapse', placeholder: m[0], items}, index: matchIndex});
                }
            } else if (type === 'carousel') {
                // Payload format: [{...}]:autoplay:dotDuration:speed
                // Locate the end of the JSON array using bracket counting, then read params after ':'
                const jsonEnd = findJsonEndIndex(payload);
                if (jsonEnd !== -1 && jsonEnd + 1 < payload.length && payload[jsonEnd + 1] === ':') {
                    const jsonStr = payload.slice(0, jsonEnd + 1);
                    const parts = payload.slice(jsonEnd + 2).split(':');
                    if (parts.length >= 3) {
                        const items = parseJsonItems(jsonStr);
                        if (items) {
                            matchesWithIndex.push({
                                embed: {
                                    type: 'carousel',
                                    placeholder: m[0],
                                    items,
                                    autoplay: parts[0].toLowerCase() === 'true',
                                    dotDuration: parts[1].toLowerCase() === 'true',
                                    speed: parseInt(parts[2], 10) || 500,
                                },
                                index: matchIndex,
                            });
                        }
                    }
                }
            }
        }
    }

    // Sort by capture position so cursor-based replacement in PageView works correctly
    matchesWithIndex.sort((a, b) => a.index - b.index);

    return matchesWithIndex.map(({embed}) => embed);
}
