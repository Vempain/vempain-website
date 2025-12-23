import type {PagedResponse} from '@vempain/vempain-auth-frontend';
import type {WebSitePage} from './WebSitePage';
import type {WebSiteGallery} from './WebSiteGallery';
import type {WebSiteFile} from './WebSiteFile';

export interface SubjectSearchResponse {
    pages: PagedResponse<WebSitePage>;
    galleries: PagedResponse<WebSiteGallery>;
    files: PagedResponse<WebSiteFile>;
}
