import {Carousel, Typography} from 'antd';
import type {EmbedItem} from '../models/PageEmbed';

const {Title} = Typography;

interface CarouselEmbedProps {
    items: EmbedItem[];
    autoplay: boolean;
    dotDuration: boolean;
    speed: number;
}

export function CarouselEmbed({items, autoplay, dotDuration, speed}: CarouselEmbedProps) {
    const autoplayConfig = autoplay
        ? (dotDuration ? {dotDuration: true} : true)
        : false;

    return (
            <Carousel autoplay={autoplayConfig} speed={speed}>
                {items.map((item, idx) => (
                        <div key={idx}>
                            <Title level={3}>{item.title}</Title>
                            <div dangerouslySetInnerHTML={{__html: item.body ?? ''}}/>
                        </div>
                ))}
            </Carousel>
    );
}
