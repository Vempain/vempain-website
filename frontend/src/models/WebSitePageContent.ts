import type {WebSiteSubject} from "./WebSiteSubject";
import type {PageEmbed} from "./PageEmbed.ts";
import type {WebSiteStyle} from "./WebSiteStyle";

export interface WebSitePageContent {
    body: string;
    header: string;
    title: string;
    creator: string;
    published: string | null;
    embeds: PageEmbed[];
    subjects?: WebSiteSubject[];

    /**
     * Optional per-page style override.
     * If null/undefined, the app should reset to default style.
     */
    style?: WebSiteStyle | null;
}
