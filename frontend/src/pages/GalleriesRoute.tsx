import {Col, Empty, Row, Spin, Typography} from 'antd';
import {useEffect, useState} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import {GalleryLoader} from '../components';
import type {WebSiteGallery} from '../models';
import {galleryAPI} from '../services';

const {Paragraph, Title} = Typography;

export function GalleriesRoute() {
    const [loading, setLoading] = useState(true);
    const [galleries, setGalleries] = useState<WebSiteGallery[]>([]);

    useEffect(() => {
        let active = true;

        galleryAPI.getPublicGalleries()
                .then((response) => {
                    if (!active) return;
                    if (response.data) {
                        setGalleries(response.data);
                    } else {
                        setGalleries([]);
                    }
                })
                .catch(() => {
                    if (!active) return;
                    setGalleries([]);
                })
                .finally(() => {
                    if (active) {
                        setLoading(false);
                    }
                });

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return <Spin/>;
    }

    if (galleries.length === 0) {
        return <Empty description="No galleries"/>;
    }

    return (
            <div className="content-section">
                <Title level={3}>Galleries</Title>
                <Row gutter={[16, 24]}>
                    {galleries.map((gallery) => (
                            <Col key={gallery.id} span={24}>
                                <Title level={4} style={{marginBottom: 4}}>
                                    <RouterLink to={`/galleries/${gallery.gallery_id}`}>
                                        {gallery.shortname || `Gallery #${gallery.gallery_id}`}
                                    </RouterLink>
                                </Title>
                                <Paragraph>{gallery.description || 'No description available'}</Paragraph>
                                <GalleryLoader galleryId={gallery.gallery_id}/>
                            </Col>
                    ))}
                </Row>
            </div>
    );
}
