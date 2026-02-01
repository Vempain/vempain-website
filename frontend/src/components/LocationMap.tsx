import {MapContainer, Marker, Popup, TileLayer, useMap} from 'react-leaflet';
import type {WebSiteLocation} from "../models";
import {Space, Typography} from "antd";
import {useEffect} from "react";

interface LocationMapProps {
    location: WebSiteLocation;
    zoom?: number;
    compass?: string | null;
}

// Component to update map view when location changes
function MapViewUpdater({position, zoom}: { position: [number, number]; zoom: number }) {
    const map = useMap();
    const lat = position[0];
    const lng = position[1];

    useEffect(() => {
        map.setView([lat, lng], zoom);
        // Invalidate size to handle container resize issues
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map, lat, lng, zoom]);

    return null;
}

export default function LocationMap({location, zoom = 15, compass}: LocationMapProps) {
    const position: [number, number] = [location.latitude, location.longitude];

    return (
            <MapContainer
                    center={position}
                    zoom={zoom}
                    style={{width: '100%', height: '100%'}}
                    scrollWheelZoom
            >
                <MapViewUpdater position={position} zoom={zoom} />
                <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        <Space direction={"vertical"} size={4} style={{width: '100%'}}>
                            {location.altitude != null && (
                                    <Typography.Text>Altitude: {location.altitude} m</Typography.Text>
                            )}
                            {location.direction != null && (
                                    <Typography.Text>
                                        Direction: {location.direction}° ({compass ?? '?'})
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

                            {location && (
                                    <Typography.Text type={"secondary"}>
                                        {location.longitude}, {location.latitude}
                                    </Typography.Text>
                            )}
                        </Space>
                    </Popup>
                </Marker>
            </MapContainer>
    );
}
