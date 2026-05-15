/// <reference types="jest" />

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
            embed_id: 42,
            placeholder: '<!--vps:embed:gallery:42-->',
        });
    });

    it('parses an image embed tag', () => {
        const body = '<p>Before</p><!--vps:embed:image:7--><p>After</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'image',
            embed_id: 7,
            placeholder: '<!--vps:embed:image:7-->',
        });
    });

    it('parses a hero embed tag', () => {
        const body = '<!--vps:embed:hero:15-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'hero',
            embed_id: 15,
            placeholder: '<!--vps:embed:hero:15-->',
        });
    });

    it('parses a collapse embed tag with inline JSON items', () => {
        const body = '<p>Text</p><!--vps:embed:collapse:[{"title":"Item A","body":"<p>Body A</p>"},{"title":"Item B","body":"<p>Body B</p>"}]--><p>More</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'collapse',
            embed_id: 0,
        });
        expect(result[0].items).toHaveLength(2);
        expect(result[0].items![0]).toMatchObject({title: 'Item A', body: '<p>Body A</p>'});
        expect(result[0].items![1]).toMatchObject({title: 'Item B', body: '<p>Body B</p>'});
    });

    it('parses a carousel embed tag with all parameters', () => {
        const body = '<!--vps:embed:carousel:[{"title":"A","body":"a"},{"title":"B","body":"b"}]:true:true:800-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embed_id: 0,
            autoplay: true,
            dot_duration: true,
            speed: 800,
        });
        expect(result[0].items).toHaveLength(2);
    });

    it('parses a carousel embed tag with autoplay false', () => {
        const body = '<!--vps:embed:carousel:[{"title":"X","body":"x"}]:false:false:400-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embed_id: 0,
            autoplay: false,
            dot_duration: false,
            speed: 400,
        });
    });

    it('parses a carousel embed tag with inline JSON items', () => {
        const body = '<!--vps:embed:carousel:[{"title":"Slide 1","body":"<p>Content 1</p>"},{"title":"Slide 2","body":"<p>Content 2</p>"}]:true:false:600-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embed_id: 0,
            autoplay: true,
            dot_duration: false,
            speed: 600,
        });
        expect(result[0].items).toHaveLength(2);
        expect(result[0].items![0]).toMatchObject({title: 'Slide 1', body: '<p>Content 1</p>'});
        expect(result[0].items![1]).toMatchObject({title: 'Slide 2', body: '<p>Content 2</p>'});
    });

    it('ignores a carousel embed tag with missing parameters', () => {
        const body = '<!--vps:embed:carousel:[{"title":"A","body":"a"}]-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('ignores embed tags with non-numeric IDs', () => {
        const body = '<!--vps:embed:image:abc-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(0);
    });

    it('parses multiple embed tags from the same body', () => {
        const body = '<p>A</p><!--vps:embed:image:1--><p>B</p><!--vps:embed:collapse:[{"title":"T","body":"B"}]--><p>C</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({type: 'image', embed_id: 1});
        expect(result[1]).toMatchObject({type: 'collapse', embed_id: 0});
        expect(result[1].items).toHaveLength(1);
    });

    it('is case-insensitive for embed type', () => {
        const body = '<!--vps:embed:GALLERY:99-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({type: 'gallery', embed_id: 99});
    });

    it('parses an HTML-entity-encoded hero embed tag', () => {
        const body = '<p>Before</p>&lt;!--vps:embed:hero:71291--&gt;<p>After</p>';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'hero',
            embed_id: 71291,
            placeholder: '&lt;!--vps:embed:hero:71291--&gt;',
        });
    });

    it('parses an HTML-entity-encoded gallery embed tag', () => {
        const body = '&lt;!--vps:embed:gallery:42--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'gallery',
            embed_id: 42,
            placeholder: '&lt;!--vps:embed:gallery:42--&gt;',
        });
    });

    it('parses a mix of literal and entity-encoded embed tags', () => {
        const body = '<!--vps:embed:image:1--><p>Mid</p>&lt;!--vps:embed:hero:2--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({type: 'image', embed_id: 1});
        expect(result[1]).toMatchObject({type: 'hero', embed_id: 2});
    });

    it('parses an HTML-entity-encoded carousel embed tag', () => {
        const body = '&lt;!--vps:embed:carousel:[{"title":"A","body":"a"}]:true:false:600--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'carousel',
            embed_id: 0,
            autoplay: true,
            dot_duration: false,
            speed: 600,
        });
        expect(result[0].items).toHaveLength(1);
    });

    it('returns duplicate embed tags in document order when the same placeholder appears more than once', () => {
        // Gallery 42 appears at positions 0 and after gallery 99 — order must be preserved
        const body = '<!--vps:embed:gallery:42--><p>Mid</p><!--vps:embed:gallery:99--><!--vps:embed:gallery:42-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({type: 'gallery', embed_id: 42});
        expect(result[1]).toMatchObject({type: 'gallery', embed_id: 99});
        expect(result[2]).toMatchObject({type: 'gallery', embed_id: 42});
    });

    it('parses a real-world page with hero, large inline collapse, and gallery', () => {
        const body = '<!--vps:embed:hero:71297--><p>Some text</p>' +
            '<!--vps:embed:collapse:[{"title":"Day 1","body":"<p>Day 1 content with special chars %2B and brackets [test]</p>"},' +
            '{"title":"Day 2","body":"<p>Day 2 content</p>"},' +
            '{"title":"Day 3","body":"<p>Day 3 content</p>"}]-->' +
            '<p>More text</p><!--vps:embed:gallery:1059-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({type: 'hero', embed_id: 71297});
        expect(result[1]).toMatchObject({type: 'collapse', embed_id: 0});
        expect(result[1].items).toHaveLength(3);
        expect(result[1].items![0].title).toBe('Day 1');
        expect(result[1].items![2].title).toBe('Day 3');
        expect(result[2]).toMatchObject({type: 'gallery', embed_id: 1059});
    });

    it('parses a video embed tag', () => {
        const body = '<!--vps:embed:video:123-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'video',
            embed_id: 123,
            placeholder: '<!--vps:embed:video:123-->',
        });
    });

    it('parses an audio embed tag', () => {
        const body = '<!--vps:embed:audio:456-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'audio',
            embed_id: 456,
            placeholder: '<!--vps:embed:audio:456-->',
        });
    });

    it('parses a youtube embed tag', () => {
        const body = '<!--vps:embed:youtube:https://www.youtube.com/watch?v=dQw4w9WgXcQ-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'youtube',
            youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        });
    });

    it('parses a music data embed tag', () => {
        const body = '<!--vps:embed:music:music_library-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'music',
            identifier: 'music_library',
            placeholder: '<!--vps:embed:music:music_library-->',
        });
    });

    it('parses a gps time series embed tag', () => {
        const body = '<!--vps:embed:gps_timeseries:gps_timeseries_holidays_2024-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'gps_timeseries',
            identifier: 'gps_timeseries_holidays_2024',
            placeholder: '<!--vps:embed:gps_timeseries:gps_timeseries_holidays_2024-->',
        });
    });

    it('parses a last-items embed tag', () => {
        const body = '<!--vps:embed:last:images:10-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'last',
            last_type: 'images',
            count: 10,
        });
    });

    it('parses an encoded last-items embed tag', () => {
        const body = '&lt;!--vps:embed:last:pages:5--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'last',
            last_type: 'pages',
            count: 5,
        });
    });

    it('parses encoded music and gps data embeds', () => {
        const body = '&lt;!--vps:embed:music:music_library--&gt;&lt;!--vps:embed:gps_timeseries:gps_timeseries_holidays_2024--&gt;';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({type: 'music', identifier: 'music_library'});
        expect(result[1]).toMatchObject({type: 'gps_timeseries', identifier: 'gps_timeseries_holidays_2024'});
    });

    it('parses mixed media and last embeds in document order', () => {
        const body = '<!--vps:embed:video:1--><p>X</p><!--vps:embed:last:documents:3--><p>Y</p><!--vps:embed:audio:2-->';
        const result = parseEmbeds(body);
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({type: 'video', embed_id: 1});
        expect(result[1]).toMatchObject({type: 'last', last_type: 'documents', count: 3});
        expect(result[2]).toMatchObject({type: 'audio', embed_id: 2});
    });
});
