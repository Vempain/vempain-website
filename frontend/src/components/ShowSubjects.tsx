import {Tag} from 'antd';
import type {WebSiteSubject} from '../models';

interface ShowSubjectsProps {
    subjects?: WebSiteSubject[];
    onSubjectClick?: (subjectId: number) => void;
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

export function ShowSubjects({subjects = [], onSubjectClick}: ShowSubjectsProps) {
    if (subjects.length === 0) {
        return null;
    }

    const handleClick = (subjectId: number, e: React.MouseEvent) => {
        e.preventDefault();
        if (onSubjectClick) {
            onSubjectClick(subjectId);
        } else {
            window.dispatchEvent(new CustomEvent('subject-search-open', {detail: [subjectId]}));
        }
    };

    return (
            <div className="subjects-list" aria-label="Subjects">
                {subjects.map((subject) => {
                    const name = getDisplayName(subject);
                    return (
                            <Tag
                                    key={subject.id}
                                    color="blue"
                                    style={{marginBottom: 4, cursor: 'pointer'}}
                                    onClick={(e) => handleClick(subject.id, e)}
                            >
                                {name}
                            </Tag>
                    );
                })}
            </div>
    );
}
