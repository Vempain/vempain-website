import {AbstractAPI} from './AbstractAPI';
import type {WebSiteConfiguration} from '../models';

class WebSiteConfigurationAPI extends AbstractAPI {
    async getAll() {
        return await this.request<WebSiteConfiguration>('/configuration');
    }
}

export const webSiteConfigurationAPI = new WebSiteConfigurationAPI(import.meta.env.VITE_APP_API_URL, '/public');
