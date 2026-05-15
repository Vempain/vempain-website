import {useEffect, useRef, useState} from 'react';
import {Spin} from 'antd';
import {fileAPI, pageAPI} from '../services';

interface AudioEmbedProps {
    fileId: number;
}

export function AudioEmbed({fileId}: AudioEmbedProps) {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef(true);

    useEffect(() => {
        activeRef.current = true;

        pageAPI.getPublicFileById(fileId)
                .then((response) => {
                    if (!activeRef.current) return;
                    const filePath = response.data?.file_path;
                    if (filePath) {
                        setSrc(fileAPI.getFileUrl(filePath));
                    }
                })
                .catch((err) => {
                    if (!activeRef.current) return;
                    console.error('Error fetching audio file:', err);
                })
                .finally(() => {
                    if (activeRef.current) {
                        setLoading(false);
                    }
                });

        return () => {
            activeRef.current = false;
        };
    }, [fileId]);

    return (
            <Spin spinning={loading}>
                {src && (
                        <audio
                                src={src}
                                controls
                                style={{maxWidth: '100%', width: '100%'}}
                        />
                )}
            </Spin>
    );
}

