import type {PageEmbed} from '../models/PageEmbed.ts';

/**
 * Parses embed tags from a page body string and returns an array of PageEmbed objects.
 * Supports: gallery, image, hero, collapse, carousel embed types.
 */
export function parseEmbeds(body: string): PageEmbed[] {
    const placeholderPattern = /<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s>]+)\s*-->/ig;
    const matches: PageEmbed[] = [];
    let m: RegExpExecArray | null;

    while ((m = placeholderPattern.exec(body)) !== null) {
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

    return matches;
}
