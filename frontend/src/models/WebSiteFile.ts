import type {WebSiteSubject} from "./WebSiteSubject";

export interface WebSiteFile {
    id: number;
    fileId: number;
    aclId: number | null;
    comment?: string | null;
    path: string;
    mimetype: string;
    originalDateTime: string | null;
    rightsHolder?: string | null;
    rightsTerms?: string | null;
    rightsUrl?: string | null;
    creatorName?: string | null;
    creatorEmail?: string | null;
    creatorCountry?: string | null;
    creatorUrl?: string | null;
    locationId?: number | null;
    width?: number | null;
    height?: number | null;
    length?: number | null;
    pages?: number | null;
    metadata?: string | null;
    subjects: WebSiteSubject[];
}
