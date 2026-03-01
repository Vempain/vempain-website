import {useEffect, useRef, useState} from 'react';
import {Carousel, Spin, Typography} from 'antd';
import {pageAPI} from '../services';
import type {WebSiteChildPage} from '../services/PageAPI';

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
