import {AbstractAPI} from './AbstractAPI.ts';
import type {ApiResponse} from '../models';

class AuthenticationAPI extends AbstractAPI {
    async login(username: string, password: string): Promise<ApiResponse<{ token: string }>> {
        const res = await this.request<{ token: string }>('/login', {
            method: 'POST',
            body: JSON.stringify({username, password}),
        });

        if (res.data?.token) {
            this.setToken(res.data.token);
        }
        return res;
    }

    async logout(): Promise<ApiResponse<null>> {
        const res = await this.request<null>('/logout', {method: 'POST'});
        this.setToken(null);
        return res;
    }

    isAuthenticated(): boolean {
        return this.getToken() !== null;
    }
}

export const authenticationAPI = new AuthenticationAPI(import.meta.env.VITE_APP_API_URL, "");
