import type {WebSiteSubject} from "./WebSiteSubject";
import type {PageEmbed} from "./PageEmbed.ts";

export interface WebSitePageContent {
    body: string;
    header: string;
    title: string;
    creator: string;
    published: string | null;
    embeds: PageEmbed[];
    subjects?: WebSiteSubject[];
}
