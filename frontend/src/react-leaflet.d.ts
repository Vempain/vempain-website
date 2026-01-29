declare module 'react-leaflet' {
    import * as React from 'react';
    import type {
        FitBoundsOptions,
        LatLngBoundsExpression,
        LatLngExpression,
        Map as LeafletMap,
        MapOptions,
        Marker as LeafletMarker,
        MarkerOptions,
        TileLayer as LeafletTileLayer,
        TileLayerOptions,
    } from 'leaflet';

    export interface MapContainerProps extends MapOptions {
        center?: LatLngExpression;
        zoom?: number;
        bounds?: LatLngBoundsExpression;
        boundsOptions?: FitBoundsOptions;
        whenReady?: () => void;
        style?: React.CSSProperties;
        className?: string;
        id?: string;
        children?: React.ReactNode;
    }

    export const MapContainer: React.ForwardRefExoticComponent<
        MapContainerProps & React.RefAttributes<LeafletMap>
    >;

    export interface TileLayerProps extends TileLayerOptions {
        url: string;
        attribution?: string;
        children?: React.ReactNode;
    }

    export const TileLayer: React.ForwardRefExoticComponent<
        TileLayerProps & React.RefAttributes<LeafletTileLayer>
    >;

    export interface MarkerProps extends MarkerOptions {
        position: LatLngExpression;
        children?: React.ReactNode;
    }

    export const Marker: React.ForwardRefExoticComponent<
        MarkerProps & React.RefAttributes<LeafletMarker>
    >;
}
