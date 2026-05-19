import {AbstractAPI} from './AbstractAPI.ts';
import type {WebSiteFile, WebSiteGallery} from '../models';
import type {PagedRequest, PagedResponse} from "@vempain/vempain-auth-frontend";

type GalleryFilePayload = WebSiteFile & {
    fileId?: number;
    aclId?: number | null;
    filePath?: string;
    originalDateTime?: string | null;
    rightsHolder?: string | null;
    rightsTerms?: string | null;
    rightsUrl?: string | null;
    creatorName?: string | null;
    creatorEmail?: string | null;
    creatorCountry?: string | null;
    creatorUrl?: string | null;
    locationId?: number | null;
};

function normalizeGalleryFile(file: GalleryFilePayload): WebSiteFile {
    return {
        ...file,
        file_id: file.file_id ?? file.fileId ?? 0,
        acl_id: file.acl_id ?? file.aclId ?? null,
        file_path: file.file_path ?? file.filePath ?? '',
        original_date_time: file.original_date_time ?? file.originalDateTime ?? null,
        rights_holder: file.rights_holder ?? file.rightsHolder ?? null,
        rights_terms: file.rights_terms ?? file.rightsTerms ?? null,
        rights_url: file.rights_url ?? file.rightsUrl ?? null,
        creator_name: file.creator_name ?? file.creatorName ?? null,
        creator_email: file.creator_email ?? file.creatorEmail ?? null,
        creator_country: file.creator_country ?? file.creatorCountry ?? null,
        creator_url: file.creator_url ?? file.creatorUrl ?? null,
        location_id: file.location_id ?? file.locationId ?? null,
    };
}

class GalleryAPI extends AbstractAPI {
    async getPublicGalleries() {
        return await this.request<WebSiteGallery[]>('');
    }

    async getGalleryFiles(
        galleryId: number,
        params: Partial<PagedRequest & { order?: string; direction?: 'asc' | 'desc'; search?: string }> = {}
    ): Promise<PagedResponse<WebSiteFile>> {
        const searchParams = new URLSearchParams();
        if (params.page !== undefined) searchParams.set('page', String(Math.max(0, params.page)));
        if (params.size !== undefined) searchParams.set('perPage', String(Math.max(1, Math.min(50, params.size))));
        if (params.order) searchParams.set('order', params.order);
        if (params.direction) searchParams.set('direction', params.direction);
        if (params.search) searchParams.set('search', params.search);
        const query = searchParams.toString();
        const response = await this.request<PagedResponse<WebSiteFile>>(`/${galleryId}/files${query ? `?${query}` : ''}`);
        if (response.error) {
            throw new Error(response.error);
        }
        const data = response.data!;
        return {
            ...data,
            content: (data.content ?? []).map((file) => normalizeGalleryFile(file as GalleryFilePayload)),
        };
    }
}

export const galleryAPI = new GalleryAPI(import.meta.env.VITE_APP_API_URL, "/galleries");
