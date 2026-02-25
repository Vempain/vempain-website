import {useEffect, useState} from 'react';
import {Spin} from 'antd';
import {fileAPI} from '../services';
import {pageAPI} from '../services/PageAPI.ts';

interface HeroEmbedProps {
    fileId: number;
    title: string;
}

export function HeroEmbed({fileId, title}: HeroEmbedProps) {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        pageAPI.getPublicFileById(fileId)
            .then((response) => {
                if (response.data?.filePath) {
                    setSrc(fileAPI.getFileUrl(response.data.filePath));
                }
            })
            .catch((err) => {
                console.error('Error fetching hero image file:', err);
            })
            .finally(() => {
                setLoading(false);
            });
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
