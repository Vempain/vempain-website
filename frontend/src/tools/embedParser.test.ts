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

    it('parses a collapse embed tag with inline JSON', () => {
        const body = '<p>Text</p><!--vps:embed:collapse:[{"title":"First","body":"Body one"},{"title":"Second","body":"Body two"}]--><p>More</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'collapse',
            placeholder: '<!--vps:embed:collapse:[{"title":"First","body":"Body one"},{"title":"Second","body":"Body two"}]-->',
            items: [
                {title: 'First', body: 'Body one'},
                {title: 'Second', body: 'Body two'},
            ],
        });
    });

    it('parses a carousel embed tag with inline JSON and all parameters', () => {
        const body = '<!--vps:embed:carousel:[{"title":"Slide 1","body":"Content 1"},{"title":"Slide 2","body":"Content 2"}]:true:true:800-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            placeholder: '<!--vps:embed:carousel:[{"title":"Slide 1","body":"Content 1"},{"title":"Slide 2","body":"Content 2"}]:true:true:800-->',
            items: [
                {title: 'Slide 1', body: 'Content 1'},
                {title: 'Slide 2', body: 'Content 2'},
            ],
            autoplay: true,
            dotDuration: true,
            speed: 800,
        });
    });

    it('parses a carousel embed tag with autoplay false', () => {
        const body = '<!--vps:embed:carousel:[{"title":"A","body":"B"}]:false:false:400-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            items: [{title: 'A', body: 'B'}],
            autoplay: false,
            dotDuration: false,
            speed: 400,
        });
    });

    it('ignores a carousel embed tag with JSON but missing autoplay/dotDuration/speed parameters', () => {
        const body = '<!--vps:embed:carousel:[{"title":"T","body":"B"}]-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('ignores a collapse embed tag with invalid JSON', () => {
        const body = '<!--vps:embed:collapse:[not valid json]-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('ignores embed tags with non-numeric IDs for gallery/image/hero', () => {
        const body = '<!--vps:embed:image:abc-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('parses multiple embed tags from the same body', () => {
        const body = '<p>A</p><!--vps:embed:image:1--><p>B</p><!--vps:embed:collapse:[{"title":"T","body":"B"}]--><p>C</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({type: 'image', embedId: 1});
        expect(result[1]).toMatchObject({type: 'collapse', items: [{title: 'T', body: 'B'}]});
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

    it('parses an HTML-entity-encoded carousel embed tag with inline JSON', () => {
        const body = '&lt;!--vps:embed:carousel:[{"title":"Slide","body":"Content"}]:true:false:600--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            items: [{title: 'Slide', body: 'Content'}],
            autoplay: true,
            dotDuration: false,
            speed: 600,
        });
    });

    it('parses an HTML-entity-encoded collapse embed tag with entity-encoded JSON quotes', () => {
        const body = '&lt;!--vps:embed:collapse:[{&quot;title&quot;:&quot;T&quot;,&quot;body&quot;:&quot;B&quot;}]--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'collapse',
            items: [{title: 'T', body: 'B'}],
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
});
