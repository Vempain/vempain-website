import {AbstractAPI} from './AbstractAPI';
import type {ApiResponse, WebSiteStyle} from '../models';

const DEFAULT_STYLE_PATH = 'document/site/default-style.json';

class ThemeAPI extends AbstractAPI {
    async getDefaultStyle(path: string = DEFAULT_STYLE_PATH): Promise<ApiResponse<WebSiteStyle>> {
        const resp = await this.request<unknown>(`/files/${path}`);

        if (!resp.data) {
            return resp as ApiResponse<WebSiteStyle>;
        }

        // Backend may return either:
        // 1) a parsed JSON object (preferred)
        // 2) a JSON string (older implementation)
        // 3) a raw string (file contents)
        const data = resp.data as unknown;

        if (typeof data === 'object' && data !== null) {
            return {data: data as WebSiteStyle, status: resp.status};
        }

        if (typeof data === 'string') {
            try {
                return {data: JSON.parse(data) as WebSiteStyle, status: resp.status};
            } catch {
                // Not JSON
                return {error: 'Default style file is not valid JSON', status: resp.status};
            }
        }

        return {error: 'Unknown default style response type', status: resp.status};
    }
}

export const themeAPI = new ThemeAPI(import.meta.env.VITE_APP_API_URL, '/public');
export {DEFAULT_STYLE_PATH};

