import {Button, Descriptions} from "antd";
import {createPortal} from "react-dom";
import {useState} from "react";
import type {MetadataEntry, WebSiteSubject} from "../models";
import {ShowSubjects} from "./ShowSubjects";


export function PreviewMetadataOverlay({entries, subjects = []}: { entries: MetadataEntry[]; subjects?: WebSiteSubject[] }) {
    const [expanded, setExpanded] = useState(false);

    return createPortal(
            <div style={{
                position: 'fixed',
                bottom: 9,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2050,
                pointerEvents: 'none',
            }}>
                <div style={{display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', pointerEvents: 'auto'}}>
                    <Button size="small" type="primary" onClick={() => setExpanded((prev) => !prev)}>
                        {expanded ? 'Hide info' : 'Show info'}
                    </Button>
                    <div style={{
                        maxHeight: expanded ? '60vh' : 0,
                        opacity: expanded ? 1 : 0,
                        transition: 'max-height 0.3s ease, opacity 0.3s ease',
                        overflow: 'hidden',
                        marginBottom: expanded ? 12 : 0,
                        width: 'min(600px, 92vw)',
                    }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            padding: 16,
                            borderRadius: 8,
                            backdropFilter: 'blur(6px)',
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
                </div>
            </div>,
            document.body
    );
}
