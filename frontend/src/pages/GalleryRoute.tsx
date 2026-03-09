import {Empty, Typography} from 'antd';
import {useMemo} from 'react';
import {useParams} from 'react-router-dom';
import {GalleryLoader} from '../components';

const {Title} = Typography;

export function GalleryRoute() {
    const {galleryId} = useParams();
    const numericGalleryId = useMemo(() => {
        const parsed = Number(galleryId);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }, [galleryId]);
    if (!numericGalleryId) {
        return <Empty description="Invalid gallery"/>;
    }
    return (
            <div className="content-section">
                <Title level={3}>Gallery #{numericGalleryId}</Title>
                <GalleryLoader galleryId={numericGalleryId}/>
            </div>
    );
}
