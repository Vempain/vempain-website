import type {WebSiteSubject} from "./WebSiteSubject";

export interface WebSiteGallery {
    id: number;
    galleryId: number;
    shortname: string | null;
    description: string | null;
    subjects: WebSiteSubject[];
}
