import type {ApiResponse} from '../models';
import Axios, {type AxiosInstance, isAxiosError, type Method} from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export abstract class AbstractAPI {
    protected axiosInstance: AxiosInstance;
    protected basePath: string;

    public constructor(baseURL: string, member: string) {
        this.basePath = baseURL;
        this.axiosInstance = Axios.create({
            baseURL: (baseURL || API_BASE_URL) + (member || ''),
            // allow cookies to be sent
            withCredentials: true,
        });
    }

    protected getToken(): string | null {
        return localStorage.getItem('jwt_token');
    }

    protected setToken(token: string | null): void {
        if (token) {
            localStorage.setItem('jwt_token', token);
        } else {
            localStorage.removeItem('jwt_token');
        }
    }

    protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        // Map RequestInit to axios request
        const headers: Record<string, string> = {};
        if (options.headers) {
            // options.headers can be Headers or Record; normalize
            if (options.headers instanceof Headers) {
                options.headers.forEach((v, k) => (headers[k] = v));
            } else if (Array.isArray(options.headers)) {
                (options.headers as Array<[string, string]>).forEach(([k, v]) => (headers[k] = v));
            } else {
                Object.assign(headers, options.headers as Record<string, string>);
            }
        }

        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const method = String(options.method ?? 'GET').toLowerCase() as Method;
        let data: unknown = undefined;
        if (options.body) {
            // body may be a string or object
            try {
                data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch {
                data = options.body;
            }
        }

        try {
            const response = await this.axiosInstance.request<T>({
                url: endpoint,
                method,
                headers,
                data,
                // ensure credentials are included (cookies)
                withCredentials: true,
            });

            // token handling: backend may return token in header X-Auth-Token
            const headersMap = response.headers as Record<string, unknown>;
            const newTokenVal = headersMap['x-auth-token'] ?? headersMap['X-Auth-Token'];
            if (typeof newTokenVal === 'string' && newTokenVal) {
                this.setToken(newTokenVal);
            }

            // Successful response
            return {data: response.data} as ApiResponse<T>;
        } catch (err) {
            if (isAxiosError(err)) {
                // Try to extract server-provided error message
                const resp = err.response;
                if (resp) {
                    // If 401, clear token
                    if (resp.status === 401) {
                        this.setToken(null);
                    }
                    // resp.data might be a object with { error }
                    const serverData: unknown = resp.data;
                    let message = '';
                    if (typeof serverData === 'string') {
                        message = serverData;
                    } else if (typeof serverData === 'object' && serverData !== null) {
                        const sd = serverData as Record<string, unknown>;
                        if (typeof sd.error === 'string') message = sd.error;
                        else if (typeof sd.message === 'string') message = sd.message;
                    }

                    if (!message) {
                        message = resp.statusText || (err.message ?? String(err));
                    }

                    return {error: String(message)};
                }
                return {error: err.message};
            }

            return {error: err instanceof Error ? err.message : 'Network error'};
        }
    }
}
