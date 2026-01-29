import {MapContainer, Marker, TileLayer, useMap} from 'react-leaflet';
import {useEffect} from 'react';

interface LocationMapProps {
    position: [number, number];
    zoom?: number;
}

function MapSizeInvalidator({position}: {position: [number, number]}) {
    const map = useMap();

    useEffect(() => {
        // Leaflet needs this when the container size changes (e.g. modal open/close, fullscreen)
        // or when the map is mounted in a flexbox container.
        const t = window.setTimeout(() => {
            map.invalidateSize();
            map.setView(position);
        }, 0);

        return () => window.clearTimeout(t);
    }, [map, position]);

    return null;
}

export default function LocationMap({position, zoom = 15}: LocationMapProps) {
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
            <Marker position={position} />
            <MapSizeInvalidator position={position} />
        </MapContainer>
    );
}
