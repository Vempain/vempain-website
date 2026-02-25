import {useEffect, useState} from 'react';
import {Collapse, Spin} from 'antd';
import {pageAPI} from '../services/PageAPI.ts';
import type {WebSiteChildPage} from '../services/PageAPI.ts';

interface CollapseEmbedProps {
    parentPageId: number;
}

export function CollapseEmbed({parentPageId}: CollapseEmbedProps) {
    const [pages, setPages] = useState<WebSiteChildPage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        pageAPI.getChildPages(parentPageId)
            .then((response) => {
                if (response.data) {
                    setPages(response.data);
                }
            })
            .catch((err) => {
                console.error('Error fetching child pages for collapse:', err);
            })
            .finally(() => {
                setLoading(false);
            });
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
