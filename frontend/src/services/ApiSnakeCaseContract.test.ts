import {afterEach, describe, expect, it, jest} from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

describe('REST snake_case contract', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses subject_ids in subject-id search payload', () => {
        const source = fs.readFileSync(path.join(process.cwd(), 'src/services/SubjectSearchAPI.ts'), 'utf8');

        expect(source).toContain('subject_ids: params.subject_ids ?? []');
        expect(source).not.toContain('subjectIds: params.subjectIds');
    });

    it('uses file_path query parameter for page content endpoint', () => {
        const source = fs.readFileSync(path.join(process.cwd(), 'src/services/PageAPI.ts'), 'utf8');

        expect(source).toContain('URLSearchParams({file_path})');
        expect(source).not.toContain('URLSearchParams({filePath');
    });
});


