import {useEffect, useRef, useState} from 'react';
import {Collapse, Spin} from 'antd';
import {pageAPI} from '../services';
import type {WebSiteChildPage} from '../services/PageAPI';

interface CollapseEmbedProps {
    parentPageId: number;
}

export function CollapseEmbed({parentPageId}: CollapseEmbedProps) {
    const [pages, setPages] = useState<WebSiteChildPage[]>([]);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef(true);

    useEffect(() => {
        activeRef.current = true;

        pageAPI.getChildPages(parentPageId)
            .then((response) => {
                if (!activeRef.current) return;
                if (response.data) {
                    setPages(response.data);
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
    }, [parentPageId]);

    const items = pages.map((page) => ({
        key: String(page.id),
        label: page.title,
        children: <div dangerouslySetInnerHTML={{__html: page.body ?? ''}}/>,
    }));

    return (
        <Spin spinning={loading}>
            <Collapse items={items}/>
        </Spin>
    );
}
