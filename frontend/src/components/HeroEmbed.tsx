import {useEffect, useRef, useState} from 'react';
import {Spin} from 'antd';
import {fileAPI, pageAPI} from '../services';

interface HeroEmbedProps {
    fileId: number;
    title: string;
}

export function HeroEmbed({fileId, title}: HeroEmbedProps) {
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
                console.error('Error fetching hero image file:', err);
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
                <div style={{position: 'relative', width: '100%'}}>
                    <img
                        src={src}
                        alt={title}
                        style={{width: '100%', height: 'auto', display: 'block'}}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <h1 style={{color: '#fff', margin: 0, textAlign: 'center', padding: '0 16px'}}>
                            {title}
                        </h1>
                    </div>
                </div>
            )}
        </Spin>
    );
}
