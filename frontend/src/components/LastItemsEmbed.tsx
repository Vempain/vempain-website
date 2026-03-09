import {Card, Col, List, Row, Spin, Typography} from 'antd';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import type {ApiResponse, LastEmbedType, PageEmbed} from '../models';
import {fileAPI} from '../services';
import {type LastItemsResponse, pageAPI} from '../services/PageAPI';
import {parseEmbeds, toFrontendPagePath} from '../tools';

const {Paragraph, Text, Title} = Typography;

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
    header?: string | null;
    body?: string | null;
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
        return toFrontendPagePath(item.filePath);
    }

    if (lastType === 'galleries' && item.galleryId) {
        return `/galleries/${item.galleryId}`;
    }

    if (item.filePath) {
        return `/file/${item.filePath}`;
    }

    return '/';
}

function getAllLink(lastType: LastEmbedType): string {
    switch (lastType) {
        case 'pages':
            return toFrontendPagePath('index');
        case 'galleries':
            return '/galleries';
        case 'images':
        case 'videos':
        case 'audio':
        case 'documents':
            return '/search';
        default:
            return '/';
    }
}

function findHeroEmbedId(body: string): number | null {
    const embeds = parseEmbeds(body);
    const hero = embeds.find((embed: PageEmbed) => embed.type === 'hero' && typeof embed.embedId === 'number');
    return hero?.embedId ?? null;
}

function createPlainTopicExcerpt(body: string, header?: string | null, maxLength = 260): string {
    if (!body || body.trim() === '') {
        return header?.trim() ?? '';
    }

    const embeds = parseEmbeds(body);
    let withoutEmbeds = body;

    for (const embed of embeds) {
        if (embed.placeholder) {
            withoutEmbeds = withoutEmbeds.split(embed.placeholder).join(' ');
        }
    }

    withoutEmbeds = withoutEmbeds
            .replace(/<!--\s*vps:embed:[\s\S]*?-->/gi, ' ')
            .replace(/&lt;!--\s*vps:embed:[\s\S]*?--&gt;/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    if (withoutEmbeds.length <= maxLength) {
        return withoutEmbeds;
    }

    return `${withoutEmbeds.slice(0, maxLength).trim()}...`;
}

function PageHeroThumbnail({heroFileId, alt}: { heroFileId: number; alt: string }) {
    const [src, setSrc] = useState<string | null>(null);
    const activeRef = useRef(true);

    useEffect(() => {
        activeRef.current = true;

        pageAPI.getPublicFileById(heroFileId)
                .then((response) => {
                    if (!activeRef.current) return;
                    if (response.data?.filePath) {
                        setSrc(fileAPI.getFileUrl(response.data.filePath));
                    }
                })
                .catch(() => {
                    if (!activeRef.current) return;
                    setSrc(null);
                });

        return () => {
            activeRef.current = false;
        };
    }, [heroFileId]);

    if (!src) {
        return null;
    }

    return (
            <img
                    src={src}
                    alt={alt}
                    style={{
                        width: '100%',
                        maxHeight: 220,
                        objectFit: 'cover',
                        borderRadius: 8,
                        display: 'block',
                    }}
            />
    );
}

function renderNavLink(path: string, label: string): React.ReactNode {
    if (path.startsWith('/file/') || path.startsWith('/api/')) {
        return <a href={path}>{label}</a>;
    }

    return <RouterLink to={path}>{label}</RouterLink>;
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
                {!error && lastType === 'pages' && (
                        <>
                            <div
                                    style={{
                                        display: 'grid',
                                        gap: 16,
                                        // Cap to 4 columns while allowing automatic 4->3->2->1 fallback.
                                        maxWidth: 1648,
                                        margin: '0 auto',
                                        justifyContent: 'center',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 400px))',
                                    }}
                            >
                                {items.map((item, index) => {
                                    const body = item.body ?? '';
                                    const heroFileId = body ? findHeroEmbedId(body) : null;
                                    const excerpt = createPlainTopicExcerpt(body, item.header);

                                    return (
                                            <Card key={`last-page-${item.id ?? index}`}>
                                                <Row gutter={[16, 16]} align="top">
                                                    {heroFileId ? (
                                                            <Col xs={24} md={8}>
                                                                <PageHeroThumbnail heroFileId={heroFileId} alt={item.title}/>
                                                            </Col>
                                                    ) : null}
                                                    <Col xs={24} md={heroFileId ? 16 : 24}>
                                                        <Title level={4} style={{marginTop: 0, marginBottom: 8}}>
                                                            {renderNavLink(getItemLink(item, lastType), item.title)}
                                                        </Title>
                                                        <Paragraph style={{marginBottom: 8}}>{excerpt}</Paragraph>
                                                        <Text type="secondary">{formatPublished(item.published)}</Text>
                                                    </Col>
                                                </Row>
                                            </Card>
                                    );
                                })}
                            </div>
                            <div style={{marginTop: 8}}>
                                {renderNavLink(allLink, `View all ${lastType}`)}
                            </div>
                        </>
                )}
                {!error && lastType !== 'pages' && (
                        <>
                            <List
                                    size="small"
                                    dataSource={items}
                                    renderItem={(item) => (
                                            <List.Item>
                                                {renderNavLink(getItemLink(item, lastType), item.title)}
                                                <Text type="secondary">{formatPublished(item.published)}</Text>
                                            </List.Item>
                                    )}
                            />
                            <div style={{marginTop: 8}}>
                                {renderNavLink(allLink, `View all ${lastType}`)}
                            </div>
                        </>
                )}
            </Spin>
    );
}
