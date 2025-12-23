import type {WebSiteSubject} from "./WebSiteSubject";

export interface WebSitePage {
    id: number;
    pageId: number;
    title: string;
    path: string;
    header: string;
    body: string | null;
    secure: boolean;
    aclId: number | null;
    published?: string | null;
    embeds?: unknown;
    subjects?: WebSiteSubject[];
}
