import {AbstractAPI} from './AbstractAPI.ts';
import type {ApiResponse, DirectoryNode, LastEmbedType, WebSiteFile, WebSitePage, WebSitePageDirectory} from '../models';
import type {PagedRequest, PagedResponse} from "@vempain/vempain-auth-frontend";


export interface LastItemsResponseItem {
    id?: number;
    title: string;
    published: string | null;
    filePath?: string | null;
    galleryId?: number | null;
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
}

export const pageAPI = new PageAPI(import.meta.env.VITE_APP_API_URL, "/public");
