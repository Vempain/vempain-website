import type {WebSiteSubject} from "./WebSiteSubject";

export interface WebSiteGallery {
    id: number;
    gallery_id: number;
    shortname: string | null;
    description: string | null;
    subjects: WebSiteSubject[];
}
