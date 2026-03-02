import {Carousel, Typography} from 'antd';

const {Title} = Typography;

interface EmbedItem {
    title: string;
    body: string;
}

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
            {items.map((item, index) => (
                <div key={index}>
                    <Title level={3}>{item.title}</Title>
                    <div dangerouslySetInnerHTML={{__html: item.body}}/>
                </div>
            ))}
        </Carousel>
    );
}
