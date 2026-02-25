import {parseEmbeds} from './embedParser';

describe('parseEmbeds', () => {
    it('returns empty array for body without embed tags', () => {
        const result = parseEmbeds('<p>Hello world</p>');
        expect(result).toEqual([]);
    });

    it('parses a gallery embed tag', () => {
        const body = '<p>Before</p><!--vps:embed:gallery:42--><p>After</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'gallery',
            embedId: 42,
            placeholder: '<!--vps:embed:gallery:42-->',
        });
    });

    it('parses an image embed tag', () => {
        const body = '<p>Before</p><!--vps:embed:image:7--><p>After</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'image',
            embedId: 7,
            placeholder: '<!--vps:embed:image:7-->',
        });
    });

    it('parses a hero embed tag', () => {
        const body = '<!--vps:embed:hero:15-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'hero',
            embedId: 15,
            placeholder: '<!--vps:embed:hero:15-->',
        });
    });

    it('parses a collapse embed tag', () => {
        const body = '<p>Text</p><!--vps:embed:collapse:30--><p>More</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'collapse',
            embedId: 30,
            placeholder: '<!--vps:embed:collapse:30-->',
        });
    });

    it('parses a carousel embed tag with all parameters', () => {
        const body = '<!--vps:embed:carousel:10:true:true:800-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embedId: 10,
            placeholder: '<!--vps:embed:carousel:10:true:true:800-->',
            autoplay: true,
            dotDuration: true,
            speed: 800,
        });
    });

    it('parses a carousel embed tag with autoplay false', () => {
        const body = '<!--vps:embed:carousel:5:false:false:400-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embedId: 5,
            autoplay: false,
            dotDuration: false,
            speed: 400,
        });
    });

    it('ignores a carousel embed tag with missing parameters', () => {
        const body = '<!--vps:embed:carousel:10-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('ignores embed tags with non-numeric IDs', () => {
        const body = '<!--vps:embed:image:abc-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('parses multiple embed tags from the same body', () => {
        const body = '<p>A</p><!--vps:embed:image:1--><p>B</p><!--vps:embed:collapse:30--><p>C</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({type: 'image', embedId: 1});
        expect(result[1]).toMatchObject({type: 'collapse', embedId: 30});
    });

    it('is case-insensitive for embed type', () => {
        const body = '<!--vps:embed:GALLERY:99-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({type: 'gallery', embedId: 99});
    });
});
