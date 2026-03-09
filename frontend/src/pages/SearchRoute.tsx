import {useMemo} from 'react';
import {useSearchParams} from 'react-router-dom';
import {SubjectSearchLoader} from '../components';

function parseSubjectIds(raw: string | null): number[] {
    if (!raw) {
        return [];
    }
    return raw
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0);
}

export function SearchRoute() {
    const [params] = useSearchParams();
    const subjectIds = useMemo(() => parseSubjectIds(params.get('subjects')), [params]);
    return <SubjectSearchLoader subjectIdList={subjectIds}/>;
}
