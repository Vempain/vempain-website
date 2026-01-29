import {MapContainer, Marker, TileLayer} from "react-leaflet";

interface LocationMapProps {
    position: [number, number];
    zoom?: number;
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
        </MapContainer>
    );
}
