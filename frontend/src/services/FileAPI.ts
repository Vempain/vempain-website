import {AbstractAPI} from './AbstractAPI.ts';
import type {WebSiteFile} from '../models';

class FileAPI extends AbstractAPI {
    async getFiles() {
        return await this.request<WebSiteFile[]>('/');
    }

    async getPublicFiles() {
        return await this.request<WebSiteFile[]>('/public');
    }

    getFileUrl(path: string): string {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        return `${API_BASE_URL}/file/${path}`;
    }

    getFileThumbUrl(mainPath: string): string {
        // Replace the last occurence of '/' with '/.thumb/'
        const lastSlashIndex = mainPath.lastIndexOf('/');
        return `${mainPath.substring(0, lastSlashIndex)}/.thumb/${mainPath.substring(lastSlashIndex + 1)}`;
    }
}

export const fileAPI = new FileAPI(import.meta.env.VITE_APP_API_URL, "/files");
