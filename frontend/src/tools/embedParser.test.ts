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

    it('parses a collapse embed tag with inline JSON items', () => {
        const body = '<p>Text</p><!--vps:embed:collapse:[{"title":"Item A","body":"<p>Body A</p>"},{"title":"Item B","body":"<p>Body B</p>"}]--><p>More</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'collapse',
            embedId: 0,
        });
        expect(result[0].items).toHaveLength(2);
        expect(result[0].items![0]).toMatchObject({title: 'Item A', body: '<p>Body A</p>'});
        expect(result[0].items![1]).toMatchObject({title: 'Item B', body: '<p>Body B</p>'});
    });

    it('parses a legacy collapse embed tag with numeric ID', () => {
        const body = '<p>Text</p><!--vps:embed:collapse:30--><p>More</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'collapse',
            embedId: 30,
            placeholder: '<!--vps:embed:collapse:30-->',
        });
        expect(result[0].items).toBeUndefined();
    });

    it('parses a legacy carousel embed tag with all parameters', () => {
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
        expect(result[0].items).toBeUndefined();
    });

    it('parses a legacy carousel embed tag with autoplay false', () => {
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

    it('parses a carousel embed tag with inline JSON items', () => {
        const body = '<!--vps:embed:carousel:[{"title":"Slide 1","body":"<p>Content 1</p>"},{"title":"Slide 2","body":"<p>Content 2</p>"}]:true:false:600-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embedId: 0,
            autoplay: true,
            dotDuration: false,
            speed: 600,
        });
        expect(result[0].items).toHaveLength(2);
        expect(result[0].items![0]).toMatchObject({title: 'Slide 1', body: '<p>Content 1</p>'});
        expect(result[0].items![1]).toMatchObject({title: 'Slide 2', body: '<p>Content 2</p>'});
    });

    it('ignores a legacy carousel embed tag with missing parameters', () => {
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

    it('parses an HTML-entity-encoded hero embed tag', () => {
        const body = '<p>Before</p>&lt;!--vps:embed:hero:71291--&gt;<p>After</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'hero',
            embedId: 71291,
            placeholder: '&lt;!--vps:embed:hero:71291--&gt;',
        });
    });

    it('parses an HTML-entity-encoded gallery embed tag', () => {
        const body = '&lt;!--vps:embed:gallery:42--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'gallery',
            embedId: 42,
            placeholder: '&lt;!--vps:embed:gallery:42--&gt;',
        });
    });

    it('parses a mix of literal and entity-encoded embed tags', () => {
        const body = '<!--vps:embed:image:1--><p>Mid</p>&lt;!--vps:embed:hero:2--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({type: 'image', embedId: 1});
        expect(result[1]).toMatchObject({type: 'hero', embedId: 2});
    });

    it('parses an HTML-entity-encoded carousel embed tag', () => {
        const body = '&lt;!--vps:embed:carousel:10:true:false:600--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embedId: 10,
            autoplay: true,
            dotDuration: false,
            speed: 600,
        });
    });

    it('returns duplicate embed tags in document order when the same placeholder appears more than once', () => {
        // Gallery 42 appears at positions 0 and after gallery 99 — order must be preserved
        const body = '<!--vps:embed:gallery:42--><p>Mid</p><!--vps:embed:gallery:99--><!--vps:embed:gallery:42-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({type: 'gallery', embedId: 42});
        expect(result[1]).toMatchObject({type: 'gallery', embedId: 99});
        expect(result[2]).toMatchObject({type: 'gallery', embedId: 42});
    });

    it('parses a real-world page with hero, large inline collapse, and gallery', () => {
        const body = '<!--vps:embed:hero:71297--><p>Some text</p>' +
            '<!--vps:embed:collapse:[{"title":"Day 1","body":"<p>Day 1 content with special chars %2B and brackets [test]</p>"},' +
            '{"title":"Day 2","body":"<p>Day 2 content</p>"},' +
            '{"title":"Day 3","body":"<p>Day 3 content</p>"}]-->' +
            '<p>More text</p><!--vps:embed:gallery:1059-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({type: 'hero', embedId: 71297});
        expect(result[1]).toMatchObject({type: 'collapse', embedId: 0});
        expect(result[1].items).toHaveLength(3);
        expect(result[1].items![0].title).toBe('Day 1');
        expect(result[1].items![2].title).toBe('Day 3');
        expect(result[2]).toMatchObject({type: 'gallery', embedId: 1059});
    });
});
