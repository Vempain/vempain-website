import {AbstractAPI} from './AbstractAPI.ts';
import type {ApiResponse, DirectoryNode, WebSiteFile, WebSitePage, WebSitePageContent, WebSitePageDirectory} from '../models';
import type {PagedRequest, PagedResponse} from "@vempain/vempain-auth-frontend";

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

    async getPageContent(file_path: string): Promise<ApiResponse<WebSitePageContent>> {
        const params = new URLSearchParams({file_path});
        return await this.request<WebSitePageContent>(`/page-content?${params.toString()}`);
    }
}

export const pageAPI = new PageAPI(import.meta.env.VITE_APP_API_URL, "/public");
