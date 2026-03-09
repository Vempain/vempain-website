import {useEffect, useRef, useState} from 'react';
import {Spin} from 'antd';
import {fileAPI, pageAPI} from '../services';

interface VideoEmbedProps {
    fileId: number;
}

export function VideoEmbed({fileId}: VideoEmbedProps) {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef(true);

    useEffect(() => {
        activeRef.current = true;

        pageAPI.getPublicFileById(fileId)
                .then((response) => {
                    if (!activeRef.current) return;
                    if (response.data?.filePath) {
                        setSrc(fileAPI.getFileUrl(response.data.filePath));
                    }
                })
                .catch((err) => {
                    if (!activeRef.current) return;
                    console.error('Error fetching video file:', err);
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
                        <video
                                src={src}
                                controls
                                style={{maxWidth: '100%', width: '100%', height: 'auto'}}
                        />
                )}
            </Spin>
    );
}

