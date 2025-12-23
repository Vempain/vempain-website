import {AbstractAPI} from './AbstractAPI.ts';
import type {WebSiteFile, WebSiteGallery, WebSiteSubject} from '../models';
import type {PagedRequest, PagedResponse} from "@vempain/vempain-auth-frontend";

class GalleryAPI extends AbstractAPI {
    async getPublicGalleries() {
        return await this.request<WebSiteGallery[]>('');
    }

    async getGalleryFiles(
        galleryId: number,
        params: Partial<PagedRequest & { order?: string; direction?: 'asc' | 'desc'; search?: string }> = {}
    ) {
        const searchParams = new URLSearchParams();
        if (params.page !== undefined) searchParams.set('page', String(Math.max(0, params.page)));
        if (params.size !== undefined) searchParams.set('perPage', String(Math.max(1, Math.min(50, params.size))));
        if (params.order) searchParams.set('order', params.order);
        if (params.direction) searchParams.set('direction', params.direction);
        if (params.search) searchParams.set('search', params.search);
        const query = searchParams.toString();
        return await this.request<PagedResponse<WebSiteFile> & { gallerySubjects: WebSiteSubject[] }>(`/${galleryId}/files${query ? `?${query}` : ''}`);
    }
}

export const galleryAPI = new GalleryAPI(import.meta.env.VITE_APP_API_URL, "/galleries");
