/// <reference types="jest" />

import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import GpsTimeSeriesEmbed from './GpsTimeSeriesEmbed';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetGpsOverview = jest.fn();
const mockGetGpsTrack = jest.fn();
const mockGetGpsClusters = jest.fn();
const mockGetGpsClusterPoints = jest.fn();

const mockMap = {
    getZoom: jest.fn(() => 8),
    getBounds: jest.fn(() => ({
        getSouth: () => 60.0,
        getNorth: () => 61.0,
        getWest: () => 24.0,
        getEast: () => 25.0,
    })),
    on: jest.fn(),
    off: jest.fn(),
};

jest.mock('leaflet', () => {
    const divIcon = jest.fn(() => ({}));
    return {
        __esModule: true,
        default: {divIcon},
        divIcon,
    };
});

jest.mock('react-leaflet', () => {
    const ReactLocal = React;

    return {
        MapContainer: ({children}: { children: React.ReactNode }) => {
            const filteredChildren = ReactLocal.Children.toArray(children).filter((child: unknown) => {
                if (!ReactLocal.isValidElement(child)) {
                    return true;
                }
                const elementType = (child as React.ReactElement).type as { name?: string };
                return elementType?.name !== 'MapViewportBridge';
            });
            return <div data-testid="map-container">{filteredChildren}</div>;
        },
        TileLayer: () => <div data-testid="tile-layer"/>,
        Marker: ({children}: { children?: React.ReactNode }) => <div data-testid="marker">{children}</div>,
        Popup: ({children}: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
        Polyline: ({positions}: { positions: Array<[number, number]> }) => (
                <div data-testid="gps-track-polyline" data-points={JSON.stringify(positions)}/>
        ),
        useMap: () => mockMap,
        __esModule: true,
        default: ReactLocal,
    };
});

jest.mock('../services', () => ({
    pageAPI: {
        getGpsOverview: (...args: unknown[]) => mockGetGpsOverview(...args),
        getGpsTrack: (...args: unknown[]) => mockGetGpsTrack(...args),
        getGpsClusters: (...args: unknown[]) => mockGetGpsClusters(...args),
        getGpsClusterPoints: (...args: unknown[]) => mockGetGpsClusterPoints(...args),
    },
}));

describe('GpsTimeSeriesEmbed', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        jest.clearAllMocks();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        mockGetGpsOverview.mockResolvedValue({
            data: {
                identifier: 'gps_timeseries_trip',
                point_count: 2,
                bounds: {
                    min_latitude: 60.0,
                    max_latitude: 61.0,
                    min_longitude: 24.0,
                    max_longitude: 25.0,
                },
            },
        });

        mockGetGpsTrack.mockResolvedValue({
            data: {
                identifier: 'gps_timeseries_trip',
                total_points: 2,
                sampled_points: 2,
                sample_step: 1,
                items: [
                    {id: 1, timestamp: '2026-01-01T10:00:00Z', latitude: 60.1, longitude: 24.9, altitude: null, filename: 'a.jpg'},
                    {id: 2, timestamp: '2026-01-01T10:05:00Z', latitude: 60.2, longitude: 25.0, altitude: null, filename: 'b.jpg'},
                ],
            },
        });

        mockGetGpsClusters.mockResolvedValue({
            data: {
                identifier: 'gps_timeseries_trip',
                zoom: 8,
                items: [],
                bounds: {
                    min_latitude: 60.0,
                    max_latitude: 61.0,
                    min_longitude: 24.0,
                    max_longitude: 25.0,
                },
            },
        });

        mockGetGpsClusterPoints.mockResolvedValue({
            data: {
                identifier: 'gps_timeseries_trip',
                cluster_key: '8:1:2',
                bounds: {
                    min_latitude: 60.0,
                    max_latitude: 61.0,
                    min_longitude: 24.0,
                    max_longitude: 25.0,
                },
                items: [],
            },
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it('calls track API and renders polyline when track points are returned', async () => {
        await act(async () => {
            root.render(<GpsTimeSeriesEmbed identifier="gps_timeseries_trip"/>);
        });

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockGetGpsTrack).toHaveBeenCalledWith('gps_timeseries_trip', 3000);

        const polyline = container.querySelector('[data-testid="gps-track-polyline"]');
        expect(polyline).not.toBeNull();
        expect(polyline?.getAttribute('data-points')).toBe(JSON.stringify([
            [60.1, 24.9],
            [60.2, 25.0],
        ]));
    });
});

