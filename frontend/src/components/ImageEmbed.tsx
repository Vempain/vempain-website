import {useEffect, useRef, useState} from 'react';
import {Image, Spin} from 'antd';
import {fileAPI, pageAPI} from '../services';

interface ImageEmbedProps {
    fileId: number;
}

export function ImageEmbed({fileId}: ImageEmbedProps) {
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
                console.error('Error fetching image file:', err);
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
                <Image
                    src={src}
                    style={{maxWidth: '100%', height: 'auto'}}
                    preview={false}
                />
            )}
        </Spin>
    );
}
