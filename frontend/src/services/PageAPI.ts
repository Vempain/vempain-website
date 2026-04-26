import {AbstractAPI} from './AbstractAPI.ts';
import type {
    ApiResponse,
    DirectoryNode,
    GpsClusterPointsResponse,
    GpsClustersResponse,
    GpsOverviewResponse,
    GpsTrackResponse,
    LastEmbedType,
    MusicDataResponse,
    WebSiteFile,
    WebSitePage,
    WebSitePageDirectory
} from '../models';
import type {PagedRequest, PagedResponse} from "@vempain/vempain-auth-frontend";


export interface LastItemsResponseItem {
    id?: number;
    title: string;
    published: string | null;
    filePath?: string | null;
    galleryId?: number | null;
    header?: string | null;
    body?: string | null;
}

export interface LastItemsResponse {
    type: LastEmbedType;
    count: number;
    items: LastItemsResponseItem[];
}

class PageAPI extends AbstractAPI {
    async getPublicPages(params: Partial<PagedRequest & { sortDir?: 'asc' | 'desc'; directory?: string | null }> = {}) {
        const searchParams = new URLSearchParams();
        if (params.page !== undefined) searchParams.set('page', String(Math.max(0, params.page)));
        if (params.size !== undefined) searchParams.set('perPage', String(Math.min(50, Math.max(1, params.size))));
        if (params.search) searchParams.set('search', params.search);
        if (params.sortDir) searchParams.set('sortDir', params.sortDir);
        if (params.directory) searchParams.set('directory', params.directory);

        const query = searchParams.toString();
        return await this.request<PagedResponse<WebSitePage>>(`/pages${query ? `?${query}` : ''}`);
    }

    async getPublicFiles(params: Partial<PagedRequest> = {}): Promise<ApiResponse<PagedResponse<WebSiteFile>>> {
        const searchParams = new URLSearchParams();
        if (params.page !== undefined) searchParams.set('page', String(Math.max(0, params.page)));
        if (params.size !== undefined) searchParams.set('perPage', String(Math.min(50, Math.max(1, params.size))));
        const query = searchParams.toString();
        return await this.request<PagedResponse<WebSiteFile>>(`/files${query ? `?${query}` : ''}`);
    }

    async getPublicPageDirectories(): Promise<ApiResponse<WebSitePageDirectory[]>> {
        return await this.request<WebSitePageDirectory[]>('/page-directories');
    }

    async getDirectoryTree(directory: string): Promise<ApiResponse<DirectoryNode[]>> {
        return await this.request<DirectoryNode[]>(`/page-directories/${directory}/tree`);
    }

    async getPageContent(file_path: string): Promise<ApiResponse<WebSitePage>> {
        const params = new URLSearchParams({file_path});
        return await this.request<WebSitePage>(`/page-content?${params.toString()}`);
    }

    async getPublicFileById(id: number): Promise<ApiResponse<WebSiteFile>> {
        return await this.request<WebSiteFile>(`/files/id/${id}`);
    }

    async getLastItems(type: LastEmbedType, count: number): Promise<ApiResponse<LastItemsResponse>> {
        const params = new URLSearchParams({
            type,
            count: String(Math.max(1, Math.min(50, count))),
        });
        return await this.request<LastItemsResponse>(`/embeds/last?${params.toString()}`);
    }

    async getMusicData(identifier: string, params: {
        page?: number;
        perPage?: number;
        sortBy?: string;
        direction?: 'asc' | 'desc';
        search?: string;
    } = {}): Promise<ApiResponse<MusicDataResponse>> {
        const searchParams = new URLSearchParams();
        if (params.page !== undefined) searchParams.set('page', String(Math.max(0, params.page)));
        if (params.perPage !== undefined) searchParams.set('perPage', String(Math.max(1, Math.min(100, params.perPage))));
        if (params.sortBy) searchParams.set('sortBy', params.sortBy);
        if (params.direction) searchParams.set('direction', params.direction);
        if (params.search) searchParams.set('search', params.search);
        return await this.request<MusicDataResponse>(`/embeds/music/${identifier}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`);
    }

    async getGpsOverview(identifier: string): Promise<ApiResponse<GpsOverviewResponse>> {
        return await this.request<GpsOverviewResponse>(`/embeds/gps/${identifier}/overview`);
    }

    async getGpsClusters(identifier: string, params: {
        zoom: number;
        minLat?: number;
        maxLat?: number;
        minLng?: number;
        maxLng?: number;
    }): Promise<ApiResponse<GpsClustersResponse>> {
        const searchParams = new URLSearchParams({zoom: String(params.zoom)});
        if (params.minLat !== undefined) searchParams.set('minLat', String(params.minLat));
        if (params.maxLat !== undefined) searchParams.set('maxLat', String(params.maxLat));
        if (params.minLng !== undefined) searchParams.set('minLng', String(params.minLng));
        if (params.maxLng !== undefined) searchParams.set('maxLng', String(params.maxLng));
        return await this.request<GpsClustersResponse>(`/embeds/gps/${identifier}/clusters?${searchParams.toString()}`);
    }

    async getGpsClusterPoints(identifier: string, clusterKey: string, limit = 250): Promise<ApiResponse<GpsClusterPointsResponse>> {
        const params = new URLSearchParams({limit: String(Math.max(1, Math.min(1000, limit)))});
        return await this.request<GpsClusterPointsResponse>(`/embeds/gps/${identifier}/clusters/${clusterKey}/points?${params.toString()}`);
    }

    async getGpsTrack(identifier: string, maxPoints = 3000): Promise<ApiResponse<GpsTrackResponse>> {
        const params = new URLSearchParams({maxPoints: String(Math.max(100, Math.min(10000, maxPoints)))});
        return await this.request<GpsTrackResponse>(`/embeds/gps/${identifier}/track?${params.toString()}`);
    }
}

export const pageAPI = new PageAPI(import.meta.env.VITE_APP_API_URL, "/public");
