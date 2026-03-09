import {List, Spin, Typography} from 'antd';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {ApiResponse, LastEmbedType} from '../models';
import {type LastItemsResponse, pageAPI} from '../services/PageAPI';

const {Link, Text} = Typography;

interface LastItemsEmbedProps {
    lastType: LastEmbedType;
    count: number;
}

interface LastItem {
    id?: number;
    title: string;
    published: string | null;
    filePath?: string | null;
    galleryId?: number | null;
}

function formatPublished(published: string | null): string {
    if (!published) {
        return '-';
    }

    const parsed = new Date(published);
    if (Number.isNaN(parsed.valueOf())) {
        return published;
    }

    return parsed.toLocaleDateString();
}

function getItemLink(item: LastItem, lastType: LastEmbedType): string {
    if (lastType === 'pages' && item.filePath) {
        return `/${encodeURI(item.filePath)}`;
    }

    if (lastType === 'galleries' && item.galleryId) {
        return `/api/galleries/${item.galleryId}/files`;
    }

    if (item.filePath) {
        return `/file/${item.filePath}`;
    }

    return '/';
}

function getAllLink(lastType: LastEmbedType): string {
    switch (lastType) {
        case 'pages':
            return '/';
        case 'galleries':
            return '/api/public/galleries';
        case 'images':
        case 'videos':
        case 'audio':
        case 'documents':
            return '/api/public/files';
        default:
            return '/';
    }
}

export function LastItemsEmbed({lastType, count}: LastItemsEmbedProps) {
    const [result, setResult] = useState<{ items: LastItem[]; error: string | null } | null>(null);
    const activeRef = useRef(true);

    useEffect(() => {
        activeRef.current = true;

        pageAPI.getLastItems(lastType, count)
                .then((response: ApiResponse<LastItemsResponse>) => {
                    if (!activeRef.current) return;
                    if (response.data?.items) {
                        setResult({items: response.data.items, error: null});
                        return;
                    }
                    setResult({items: [], error: response.error ?? 'Failed to load latest items'});
                })
                .catch((err: unknown) => {
                    if (!activeRef.current) return;
                    setResult({items: [], error: err instanceof Error ? err.message : 'Failed to load latest items'});
                });

        return () => {
            activeRef.current = false;
        };
    }, [lastType, count]);

    const allLink = useMemo(() => getAllLink(lastType), [lastType]);
    const loading = result === null;
    const items = result?.items ?? [];
    const error = result?.error ?? null;

    return (
            <Spin spinning={loading}>
                {error && <Text type="danger">{error}</Text>}
                {!error && (
                        <>
                            <List
                                    size="small"
                                    dataSource={items}
                                    renderItem={(item) => (
                                            <List.Item>
                                                <Link href={getItemLink(item, lastType)}>{item.title}</Link>
                                                <Text type="secondary">{formatPublished(item.published)}</Text>
                                            </List.Item>
                                    )}
                            />
                            <div style={{marginTop: 8}}>
                                <Link href={allLink}>View all {lastType}</Link>
                            </div>
                        </>
                )}
            </Spin>
    );
}
