import {Descriptions} from "antd";
import {createPortal} from "react-dom";
import type {MetadataEntry, WebSiteSubject} from "../models";
import {ShowSubjects} from "./ShowSubjects";


export function MetadataOverlay({entries, subjects = []}: { entries: MetadataEntry[]; subjects?: WebSiteSubject[] }) {
    return createPortal(
            <div style={{
                position: 'fixed',
                bottom: 130, // keep clear of preview controls and button
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2050,
                pointerEvents: 'none',
            }}>
                <div style={{display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', pointerEvents: 'auto'}}>
                    <div style={{
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        padding: 16,
                        borderRadius: 8,
                        backdropFilter: 'blur(6px)',
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        width: 'min(600px, 92vw)',
                    }}>
                        <Descriptions
                                size="small"
                                column={1}
                                styles={{
                                    label: {color: '#d9d9d9'},
                                    content: {color: '#fff'}
                                }}
                        >
                            {entries.map((entry) => (
                                    <Descriptions.Item label={entry.label} key={entry.label}>
                                        {entry.value}
                                    </Descriptions.Item>
                            ))}
                        </Descriptions>
                        {subjects && subjects.length > 0 && (
                                <div style={{marginTop: 12}}>
                                    <ShowSubjects subjects={subjects} max={6}/>
                        </div>
                        )}
                    </div>
                </div>
            </div>,
            document.body
    );
}
