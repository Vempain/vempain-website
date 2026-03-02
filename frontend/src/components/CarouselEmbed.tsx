import {useEffect, useRef, useState} from 'react';
import {Carousel, Spin, Typography} from 'antd';
import {pageAPI} from '../services';
import type {EmbedItem} from '../models/PageEmbed';
import type {WebSiteChildPage} from '../services/PageAPI';

const {Title} = Typography;

interface CarouselEmbedProps {
    /** Legacy: parent page ID to fetch children from */
    parentPageId?: number;
    /** New: inline items provided directly from the embed tag */
    items?: EmbedItem[];
    autoplay: boolean;
    dotDuration: boolean;
    speed: number;
}

export function CarouselEmbed({parentPageId, items: inlineItems, autoplay, dotDuration, speed}: CarouselEmbedProps) {
    const [fetchedPages, setFetchedPages] = useState<WebSiteChildPage[]>([]);
    const [loading, setLoading] = useState(!inlineItems);
    const activeRef = useRef(true);

    useEffect(() => {
        // If we have inline items, no need to fetch from backend
        if (inlineItems) return;
        if (!parentPageId) return;

        activeRef.current = true;

        pageAPI.getChildPages(parentPageId)
                .then((response) => {
                    if (!activeRef.current) return;
                    if (response.data) {
                        setFetchedPages(response.data);
                    }
                })
                .catch((err) => {
                    if (!activeRef.current) return;
                    console.error('Error fetching child pages for carousel:', err);
                })
                .finally(() => {
                    if (activeRef.current) {
                        setLoading(false);
                    }
                });

        return () => {
            activeRef.current = false;
        };
    }, [parentPageId, inlineItems]);

    const autoplayConfig = autoplay
        ? (dotDuration ? {dotDuration: true} : true)
        : false;

    const entries: Array<{ key: string; title: string; body: string }> = inlineItems
            ? inlineItems.map((item, idx) => ({key: String(idx), title: item.title, body: item.body ?? ''}))
            : fetchedPages.map((page) => ({key: String(page.id), title: page.title, body: page.body ?? ''}));

    return (
            <Spin spinning={loading}>
                <Carousel autoplay={autoplayConfig} speed={speed}>
                    {entries.map((entry) => (
                            <div key={entry.key}>
                                <Title level={3}>{entry.title}</Title>
                                <div dangerouslySetInnerHTML={{__html: entry.body}}/>
                            </div>
                    ))}
                </Carousel>
            </Spin>
    );
}
