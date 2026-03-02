import {useEffect, useRef, useState} from 'react';
import {Collapse, Spin} from 'antd';
import {pageAPI} from '../services';
import type {EmbedItem} from '../models/PageEmbed';
import type {WebSiteChildPage} from '../services/PageAPI';

interface CollapseEmbedProps {
    /** Legacy: parent page ID to fetch children from */
    parentPageId?: number;
    /** New: inline items provided directly from the embed tag */
    items?: EmbedItem[];
}

export function CollapseEmbed({parentPageId, items: inlineItems}: CollapseEmbedProps) {
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
                    console.error('Error fetching child pages for collapse:', err);
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

    const collapseItems = inlineItems
            ? inlineItems.map((item, idx) => ({
                key: String(idx),
                label: item.title,
                children: <div dangerouslySetInnerHTML={{__html: item.body ?? ''}}/>,
            }))
            : fetchedPages.map((page) => ({
                key: String(page.id),
                label: page.title,
                children: <div dangerouslySetInnerHTML={{__html: page.body ?? ''}}/>,
            }));

    return (
            <Spin spinning={loading}>
                <Collapse items={collapseItems}/>
            </Spin>
    );
}
