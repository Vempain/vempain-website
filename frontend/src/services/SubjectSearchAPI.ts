import {AbstractAPI} from './AbstractAPI';
import type {SubjectSearchResponse, WebSiteSubject} from '../models';
import type {PagedRequest} from '@vempain/vempain-auth-frontend';


export interface SubjectSearchByIdsRequest extends Partial<PagedRequest> {
    subjectIds: number[];
    sort_by?: string;
    direction?: 'asc' | 'desc';
}

class SubjectSearchAPI extends AbstractAPI {
    async autocomplete(term: string) {
        const params = new URLSearchParams();
        params.set('q', term);
        return await this.request<WebSiteSubject[]>(`/subjects/autocomplete?${params.toString()}`);
    }

    async search(params: Partial<PagedRequest> & { search?: string; case_sensitive?: boolean } = {}) {
        const payload = {
            page: params.page ?? 0,
            size: params.size ?? 12,
            sort_by: params.sort_by ?? 'id',
            direction: params.direction ?? 'asc',
            search: params.search ?? '',
            case_sensitive: params.case_sensitive ?? false,
        };
        return await this.request<SubjectSearchResponse>('/subject-search', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async searchByIds(params: SubjectSearchByIdsRequest): Promise<SubjectSearchResponse> {
        const payload = {
            subjectIds: params.subjectIds ?? [],
            page: params.page ?? 0,
            size: params.size ?? 12,
            sort_by: params.sort_by ?? 'id',
            direction: params.direction ?? 'ASC',
        };

        const response = await this.axiosInstance.post<SubjectSearchResponse>('/subjects/search', payload);
        return response.data;
    }
}

export const subjectSearchAPI = new SubjectSearchAPI(import.meta.env.VITE_APP_API_URL, '/public');
