import type {WebSiteSubject} from "./WebSiteSubject";
import type {PageEmbed} from "./PageEmbed.ts";
import type {WebSiteStyle} from "./WebSiteStyle.ts";

export interface WebSitePage {
    id: number;
    pageId: number;
    title: string;
    path: string;
    header: string;
    body: string;
    page_style: WebSiteStyle | null;
    secure: boolean;
    aclId: number | null;
    creator: string;
    created?: string | null;
    modifier?: string | null;
    modified?: string | null;
    embeds?: PageEmbed[];
    subjects?: WebSiteSubject[];
}
