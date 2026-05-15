import type {WebSiteSubject} from "./WebSiteSubject";
import type {PageEmbed} from "./PageEmbed.ts";
import type {WebSiteStyle} from "./WebSiteStyle.ts";

export interface WebSitePage {
    id: number;
    page_id: number;
    title: string;
    path?: string;
    file_path?: string;
    header: string;
    body: string;
    page_style: WebSiteStyle | null;
    secure: boolean;
    acl_id: number | null;
    creator: string;
    created?: string | null;
    modifier?: string | null;
    modified?: string | null;
    published?: string | null;
    embeds?: PageEmbed[];
    subjects?: WebSiteSubject[];
}
