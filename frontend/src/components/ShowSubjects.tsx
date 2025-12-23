import {Tag, Tooltip} from 'antd';
import type {WebSiteSubject} from '../models';

interface ShowSubjectsProps {
    subjects?: WebSiteSubject[];
    max?: number;
}

const getDisplayName = (subject: WebSiteSubject): string => {
    return subject.subject
            ?? subject.subject_en
            ?? subject.subject_fi
            ?? subject.subject_se
            ?? subject.subject_de
            ?? subject.subject_es
            ?? `Subject #${subject.id}`;
};

export function ShowSubjects({subjects = [], max = 8}: ShowSubjectsProps) {
    if (subjects.length === 0) {
        return null;
    }

    const visible = subjects.slice(0, max);
    const overflow = subjects.slice(max);

    return (
            <div className="subjects-list" aria-label="Subjects">
                {visible.map((subject) => {
                    const name = getDisplayName(subject);
                    return (
                            <Tag key={subject.id} color="blue" style={{marginBottom: 4}}>
                                {name}
                            </Tag>
                    );
                })}
                {overflow.length > 0 && (
                        <Tooltip
                                title={overflow.map((subject) => getDisplayName(subject)).join(', ')}
                        >
                            <Tag color="blue" variant={"filled"} style={{marginBottom: 4}}>
                                +{overflow.length}
                            </Tag>
                        </Tooltip>
                )}
            </div>
    );
}

