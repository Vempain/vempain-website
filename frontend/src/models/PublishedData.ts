export interface MusicDataRow {
    id: number;
    artist: string | null;
    album_artist: string | null;
    album: string | null;
    year: number | null;
    track_number: number | null;
    track_total: number | null;
    track_name: string | null;
    genre: string | null;
    duration_seconds: number | null;
}

export interface MusicDataResponse {
    identifier: string;
    items: MusicDataRow[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
    first: boolean;
    last: boolean;
    sort_by: string;
    direction: 'asc' | 'desc';
    search: string;
}

export interface GpsBounds {
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
}

export interface GpsClusterItem {
    cluster_key: string;
    kind: 'cluster' | 'point';
    point_count: number;
    latitude: number;
    longitude: number;
    bounds: GpsBounds;
    cell_bounds: GpsBounds;
    sample_filename: string | null;
    first_timestamp: string | null;
    last_timestamp: string | null;
}

export interface GpsOverviewResponse {
    identifier: string;
    point_count: number;
    bounds: GpsBounds | null;
}

export interface GpsClustersResponse {
    identifier: string;
    zoom: number;
    items: GpsClusterItem[];
    bounds: GpsBounds | null;
}

export interface GpsPoint {
    id: number;
    timestamp: string | null;
    latitude: number;
    longitude: number;
    altitude: number | null;
    filename: string | null;
}

export interface GpsClusterPointsResponse {
    identifier: string;
    cluster_key: string;
    bounds: GpsBounds;
    items: GpsPoint[];
}

export interface GpsTrackResponse {
    identifier: string;
    total_points: number;
    sampled_points: number;
    sample_step: number;
    items: GpsPoint[];
}

