import type {WebSiteSubject} from "./WebSiteSubject";
import type {WebSiteLocation} from "./WebSiteLocation";

export interface WebSiteFile {
    id: number;
    file_id: number;
    acl_id: number | null;
    comment?: string | null;
    file_path: string;
    mimetype: string;
    original_date_time: string | null;
    rights_holder?: string | null;
    rights_terms?: string | null;
    rights_url?: string | null;
    creator_name?: string | null;
    creator_email?: string | null;
    creator_country?: string | null;
    creator_url?: string | null;
    location?: WebSiteLocation | null;
    location_id?: number | null;
    width?: number | null;
    height?: number | null;
    length?: number | null;
    pages?: number | null;
    metadata?: string | null;
    subjects: WebSiteSubject[];
}
