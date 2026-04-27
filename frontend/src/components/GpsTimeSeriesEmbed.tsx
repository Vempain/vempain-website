import {Alert, Empty, Spin, Typography} from 'antd';
import L, {type DivIcon, type LatLngBoundsExpression, type Map as LeafletMap, type Marker as LeafletMarker} from 'leaflet';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {MapContainer, Marker, Polyline, Popup, TileLayer, useMap} from 'react-leaflet';
import type {GpsBounds, GpsClusterItem, GpsPoint} from '../models';
import {pageAPI} from '../services';

interface GpsTimeSeriesEmbedProps {
    identifier: string;
}

const clusterIconCache = new Map<string, DivIcon>();
const pointIconCache = new Map<string, DivIcon>();

function toLeafletBounds(bounds: GpsBounds): LatLngBoundsExpression {
    return [
        [bounds.min_latitude, bounds.min_longitude],
        [bounds.max_latitude, bounds.max_longitude],
    ];
}

function buildClusterIcon(pointCount: number): DivIcon {
    const cacheKey = String(pointCount);
    const cached = clusterIconCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const icon = L.divIcon({
        className: 'gps-cluster-icon',
        html: `<div style="background:#1677ff;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${pointCount}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
    clusterIconCache.set(cacheKey, icon);
    return icon;
}

function buildPointIcon(color: string): DivIcon {
    const cached = pointIconCache.get(color);
    if (cached) {
        return cached;
    }

    const icon = L.divIcon({
        className: 'gps-point-icon',
        html: `<div style="background:${color};border-radius:50%;width:14px;height:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
    pointIconCache.set(color, icon);
    return icon;
}

function MapViewportBridge({
                               onMapReady,
                               onViewportChange,
                           }: {
    onMapReady: (map: LeafletMap | null) => void;
    onViewportChange: (map: LeafletMap) => void;
}) {
    const map = useMap();

    useEffect(() => {
        onMapReady(map);
        const handleViewportChange = () => {
            onViewportChange(map);
        };

        handleViewportChange();
        map.on('moveend', handleViewportChange);
        map.on('zoomend', handleViewportChange);

        return () => {
            map.off('moveend', handleViewportChange);
            map.off('zoomend', handleViewportChange);
            onMapReady(null);
        };
    }, [map, onMapReady, onViewportChange]);

    return null;
}

function ClusterMarker({cluster, onExpand}: { cluster: GpsClusterItem; onExpand: (cluster: GpsClusterItem) => Promise<void> }) {
    const markerRef = useRef<LeafletMarker | null>(null);

    useEffect(() => {
        if (cluster.kind !== 'cluster' || markerRef.current == null) {
            return;
        }

        const marker = markerRef.current;
        const handler = () => {
            void onExpand(cluster);
        };
        marker.on('click', handler);

        return () => {
            marker.off('click', handler);
        };
    }, [cluster, onExpand]);

    return (
            <Marker
                    ref={markerRef}
                    position={[cluster.latitude, cluster.longitude]}
                    icon={buildClusterIcon(cluster.point_count)}
            >
                <Popup>
                    {cluster.point_count} GPS points between {cluster.first_timestamp ?? '-'} and {cluster.last_timestamp ?? '-'}
                </Popup>
            </Marker>
    );
}

export default function GpsTimeSeriesEmbed({identifier}: GpsTimeSeriesEmbedProps) {
    const [overviewBounds, setOverviewBounds] = useState<GpsBounds | null>(null);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [trackPoints, setTrackPoints] = useState<GpsPoint[]>([]);
    const [loadingTrack, setLoadingTrack] = useState(false);
    const [trackError, setTrackError] = useState<string | null>(null);
    const [clusters, setClusters] = useState<GpsClusterItem[]>([]);
    const [loadingClusters, setLoadingClusters] = useState(false);
    const [clusterError, setClusterError] = useState<string | null>(null);
    const [expandedPoints, setExpandedPoints] = useState<GpsPoint[]>([]);
    const [expansionError, setExpansionError] = useState<string | null>(null);
    const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);

    useEffect(() => {
        let active = true;
        const timerId = window.setTimeout(() => {
            setLoadingOverview(true);
            setOverviewError(null);
            void pageAPI.getGpsOverview(identifier).then((response) => {
                if (!active) {
                    return;
                }
                if (response.data?.bounds) {
                    setOverviewBounds(response.data.bounds);
                    setLoadingOverview(false);
                    return;
                }

                setOverviewBounds(null);
                setOverviewError(response.error ?? 'No GPS data available');
                setLoadingOverview(false);
            });
        }, 0);

        return () => {
            active = false;
            window.clearTimeout(timerId);
        };
    }, [identifier]);

    useEffect(() => {
        let active = true;
        const timerId = window.setTimeout(() => {
            setLoadingTrack(true);
            setTrackError(null);
            void pageAPI.getGpsTrack(identifier, 3000).then((response) => {
                if (!active) {
                    return;
                }
                if (response.data) {
                    setTrackPoints(response.data.items);
                    setLoadingTrack(false);
                    return;
                }

                setTrackPoints([]);
                setTrackError(response.error ?? 'Failed to load GPS track path');
                setLoadingTrack(false);
            });
        }, 0);

        return () => {
            active = false;
            window.clearTimeout(timerId);
        };
    }, [identifier]);

    const loadClusters = useCallback(async (map: LeafletMap) => {
        const bounds = map.getBounds();
        setLoadingClusters(true);
        setClusterError(null);
        setExpansionError(null);
        setExpandedPoints([]);

        const response = await pageAPI.getGpsClusters(identifier, {
            zoom: Math.round(map.getZoom()),
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast(),
        });

        if (response.data) {
            setClusters(response.data.items);
            setLoadingClusters(false);
            return;
        }

        setClusters([]);
        setClusterError(response.error ?? 'Failed to load GPS map data');
        setLoadingClusters(false);
    }, [identifier]);

    const handleClusterExpand = useCallback(async (cluster: GpsClusterItem) => {
        if (cluster.kind !== 'cluster') {
            return;
        }

        setExpansionError(null);
        const response = await pageAPI.getGpsClusterPoints(identifier, cluster.cluster_key, 500);
        if (response.data) {
            setExpandedPoints(response.data.items);
            return;
        }

        setExpandedPoints([]);
        setExpansionError(response.error ?? 'Failed to expand GPS cluster');
    }, [identifier]);

    const mapBounds = useMemo(() => overviewBounds ? toLeafletBounds(overviewBounds) : undefined, [overviewBounds]);
    const trackPath = useMemo(() => trackPoints.map((point) => [point.latitude, point.longitude] as [number, number]), [trackPoints]);

    if (loadingOverview) {
        return <Spin spinning={true}>
            <div style={{minHeight: 320}}/>
        </Spin>;
    }

    if (overviewError) {
        return <Alert type="warning" message={overviewError}/>;
    }

    if (!overviewBounds) {
        return <Empty description="No GPS time series data available" image={Empty.PRESENTED_IMAGE_SIMPLE}/>;
    }

    return (
            <div style={{margin: '24px 0'}}>
                <Typography.Title level={4} style={{marginBottom: 12}}>GPS time series</Typography.Title>
                {trackError && <Alert type="warning" message={trackError} style={{marginBottom: 12}}/>}
                {clusterError && <Alert type="error" message={clusterError} style={{marginBottom: 12}}/>}
                {expansionError && <Alert type="warning" message={expansionError} style={{marginBottom: 12}}/>}
                <div style={{height: 520, borderRadius: 8, overflow: 'hidden'}}>
                    <MapContainer
                            bounds={mapBounds}
                            style={{width: '100%', height: '100%'}}
                            scrollWheelZoom
                    >
                        <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapViewportBridge
                                onMapReady={setMapInstance}
                                onViewportChange={loadClusters}
                        />
                        {trackPath.length > 1 && (
                                <Polyline positions={trackPath} color="#52c41a" weight={3} opacity={0.85}/>
                        )}
                        {clusters.map((cluster) => cluster.kind === 'cluster' ? (
                                <ClusterMarker key={cluster.cluster_key} cluster={cluster} onExpand={handleClusterExpand}/>
                        ) : (
                                <Marker
                                        key={cluster.cluster_key}
                                        position={[cluster.latitude, cluster.longitude]}
                                        icon={buildPointIcon('#1677ff')}
                                >
                                    <Popup>{cluster.sample_filename ?? 'GPS point'}</Popup>
                                </Marker>
                        ))}
                        {expandedPoints.map((point) => (
                                <Marker
                                        key={`expanded-${point.id}`}
                                        position={[point.latitude, point.longitude]}
                                        icon={buildPointIcon('#ff4d4f')}
                                >
                                    <Popup>
                                        <div>
                                            <div>{point.filename ?? 'GPS point'}</div>
                                            <div>{point.timestamp ?? '-'}</div>
                                            <div>{point.latitude}, {point.longitude}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                        ))}
                    </MapContainer>
                </div>
                <Typography.Paragraph type="secondary" style={{marginTop: 8, marginBottom: 0}}>
                    Dataset: {identifier}
                    {loadingTrack ? ' · loading track path…' : ''}
                    {loadingClusters ? ' · loading visible map area…' : ''}
                </Typography.Paragraph>
                {mapInstance && expandedPoints.length > 0 && (
                        <Typography.Paragraph type="secondary" style={{marginTop: 4, marginBottom: 0}}>
                            Expanded {expandedPoints.length} point{expandedPoints.length === 1 ? '' : 's'} from the selected cluster.
                        </Typography.Paragraph>
                )}
            </div>
    );
}
