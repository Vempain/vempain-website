import {CloseOutlined, ExpandOutlined, ShrinkOutlined} from '@ant-design/icons';
import {Button, Modal, Space, Typography} from 'antd';
import {lazy, Suspense, useMemo, useState} from 'react';
import type {WebSiteLocation} from '../models';
import {parseCoordinate, toCompass16} from '../tools';

const LazyLocationMap = lazy(() => import('./LocationMap'));

interface LocationModalProps {
    open: boolean;
    location: WebSiteLocation;
    onClose: () => void;
}

export function LocationModal({open, location, onClose}: LocationModalProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const latitude = useMemo(() => parseCoordinate(location.latitude, location.latitude_ref), [location.latitude, location.latitude_ref]);
    const longitude = useMemo(() => parseCoordinate(location.longitude, location.longitude_ref), [location.longitude, location.longitude_ref]);

    const position = useMemo<[number, number] | null>(() => {
        if (latitude === null || longitude === null) {
            return null;
        }
        return [latitude, longitude];
    }, [latitude, longitude]);

    const compass = useMemo(() => toCompass16(location.direction), [location.direction]);

    const bodyStyle = useMemo(() => {
        const height = isFullscreen ? 'calc(100vh - 110px)' : '70vh';
        return {
            height,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 12,
        };
    }, [isFullscreen]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={isFullscreen ? '100vw' : '90vw'}
            style={isFullscreen ? {top: 0, padding: 0, maxWidth: '100vw'} : undefined}
            bodyStyle={bodyStyle}
            styles={{
                header: {marginBottom: 0},
                body: {paddingTop: 12},
            }}
            title={
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Typography.Text strong>Location</Typography.Text>
                    <Space>
                        <Button
                            aria-label={isFullscreen ? 'Restore' : 'Fullscreen'}
                            title={isFullscreen ? 'Restore' : 'Fullscreen'}
                            size="small"
                            icon={isFullscreen ? <ShrinkOutlined /> : <ExpandOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFullscreen((prev) => !prev);
                            }}
                        />
                        <Button
                            aria-label="Close"
                            title="Close"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        />
                    </Space>
                </div>
            }
            closable={false}
        >
            <div style={{flex: 1, minHeight: 300, borderRadius: 8, overflow: 'hidden'}}>
                {position ? (
                    open ? (
                        <Suspense
                            fallback={
                                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <Typography.Text type="secondary">Loading map</Typography.Text>
                                </div>
                            }
                        >
                            <LazyLocationMap
                                key={`${position[0]},${position[1]}`}
                                position={position}
                            />
                        </Suspense>
                    ) : null
                ) : (
                    <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Typography.Text type="secondary">No coordinates available</Typography.Text>
                    </div>
                )}
            </div>

            <div style={{background: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8}}>
                <Space direction="vertical" size={4} style={{width: '100%'}}>
                    {location.altitude != null && (
                        <Typography.Text>Altitude: {location.altitude} m</Typography.Text>
                    )}
                    {location.direction != null && (
                        <Typography.Text>
                            Direction: {location.direction} ({compass ?? '?'})
                        </Typography.Text>
                    )}
                    {location.satellite_count != null && (
                        <Typography.Text>Satellites: {location.satellite_count}</Typography.Text>
                    )}

                    {(location.country || location.state || location.city) && (
                        <Typography.Text>
                            {[
                                location.country,
                                location.state,
                                location.city,
                            ]
                                .filter(Boolean)
                                .join(', ')}
                        </Typography.Text>
                    )}

                    {(location.street || location.sub_location) && (
                        <Typography.Text>
                            {[
                                location.street,
                                location.sub_location,
                            ]
                                .filter(Boolean)
                                .join(', ')}
                        </Typography.Text>
                    )}

                    {position && (
                        <Typography.Text type="secondary">
                            {position[0].toFixed(6)}, {position[1].toFixed(6)}
                        </Typography.Text>
                    )}
                </Space>
            </div>
        </Modal>
    );
}
