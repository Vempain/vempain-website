import {MapContainer, Marker, Popup, TileLayer} from 'react-leaflet';
import type {WebSiteLocation} from "../models";
import {Space, Typography} from "antd";

interface LocationMapProps {
    location: WebSiteLocation;
    zoom?: number;
    compass?: string | null;
}

export default function LocationMap({location, zoom = 15, compass}: LocationMapProps) {
    const position = [location.latitude, location.longitude] as [number, number];

    return (
            <MapContainer
                    center={position}
                    zoom={zoom}
                    style={{width: '100%', height: '100%'}}
                    scrollWheelZoom
            >
                <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        <Space orientation={"vertical"} size={4} style={{width: '100%'}}>
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
