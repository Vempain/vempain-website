import {useEffect, useState} from 'react';
import {Carousel, Spin, Typography} from 'antd';
import {pageAPI} from '../services/PageAPI.ts';
import type {WebSiteChildPage} from '../services/PageAPI.ts';

const {Title} = Typography;

interface CarouselEmbedProps {
    parentPageId: number;
    autoplay: boolean;
    dotDuration: boolean;
    speed: number;
}

export function CarouselEmbed({parentPageId, autoplay, dotDuration, speed}: CarouselEmbedProps) {
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
                console.error('Error fetching child pages for carousel:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [parentPageId]);

    const autoplayConfig = autoplay
        ? (dotDuration ? {dotDuration: true} : true)
        : false;

    return (
        <Spin spinning={loading}>
            <Carousel autoplay={autoplayConfig} speed={speed}>
                {pages.map((page) => (
                    <div key={page.id}>
                        <Title level={3}>{page.title}</Title>
                        <div dangerouslySetInnerHTML={{__html: page.body ?? ''}}/>
                    </div>
                ))}
            </Carousel>
        </Spin>
    );
}
