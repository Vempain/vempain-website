export interface WebSiteLocation {
    id: number;
    latitude: number;
    latitude_ref: string;
    longitude: number;
    longitude_ref: string;
    altitude?: number | null;
    direction?: number | null;
    satellite_count?: number | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    street?: string | null;
    sub_location?: string | null;
}
