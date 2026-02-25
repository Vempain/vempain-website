import {useEffect, useState} from 'react';
import {Image, Spin} from 'antd';
import {fileAPI} from '../services';
import {pageAPI} from '../services/PageAPI.ts';

interface ImageEmbedProps {
    fileId: number;
}

export function ImageEmbed({fileId}: ImageEmbedProps) {
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
                console.error('Error fetching image file:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [fileId]);

    return (
        <Spin spinning={loading}>
            {src && (
                <Image
                    src={src}
                    style={{maxWidth: '100%', height: 'auto'}}
                    preview={false}
                />
            )}
        </Spin>
    );
}
