import {Col, Input, Pagination, Row, Typography} from 'antd';
import React, {useMemo} from 'react';
import {GalleryLoader, ShowSubjects} from './index';
import type {WebSitePage, WebSitePageContent} from '../models';

const {Title, Paragraph} = Typography;

interface PageViewProps {
    pageContent: WebSitePageContent | null;
    pages: WebSitePage[];
    pagination: { page: number; size: number; total_elements: number };
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onSearchSubmit: () => void;
    onPageChange: (pageNumber: number) => void;
    pageError?: string | null;
    pageStatus?: number | null;
}

function PageView({pageContent, pages, pagination, searchInput, onSearchInputChange, onSearchSubmit, onPageChange, pageError, pageStatus}: PageViewProps) {
    function renderPageBody(body: string, embeds: WebSitePageContent['embeds']) {
        if (!body) return null;

        let resolvedEmbeds = embeds;
        if ((!resolvedEmbeds || resolvedEmbeds.length === 0) && body) {
            const placeholderPattern = /<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s>]+)\s*-->/ig;
            const matches: Array<{ type: string; galleryId?: number; placeholder: string }> = [];
            let m: RegExpExecArray | null;
            while ((m = placeholderPattern.exec(body)) !== null) {
                const type = (m.groups?.type ?? '').toLowerCase();
                const payload = m.groups?.payload ?? '';
                if (type === 'gallery' && /^\d+$/.test(payload)) {
                    matches.push({type: 'gallery', galleryId: Number(payload), placeholder: m[0]});
                }
            }
            if (matches.length > 0) {
                resolvedEmbeds = matches.map((x) => ({type: x.type, galleryId: x.galleryId as number, placeholder: x.placeholder}));
            }
        }

        if (!resolvedEmbeds || resolvedEmbeds.length === 0) {
            return <div dangerouslySetInnerHTML={{__html: body}}/>;
        }

        const segments: React.ReactNode[] = [];
        let cursor = 0;

        resolvedEmbeds.forEach((embed, index) => {
            const placeholder = embed.placeholder ?? `<!--vps:embed:${embed.type}:${embed.galleryId}-->`;
            const placeholderIndex = body.indexOf(placeholder, cursor);

            if (placeholderIndex === -1) {
                return;
            }

            const beforeHtml = body.slice(cursor, placeholderIndex);
            if (beforeHtml.trim()) {
                segments.push(
                        <div key={`html-${index}`} dangerouslySetInnerHTML={{__html: beforeHtml}}/>
                );
            }

            if (embed.type === 'gallery' && embed.galleryId) {
                segments.push(
                        <GalleryLoader key={`gallery-${embed.galleryId}-${index}`} galleryId={embed.galleryId}/>
                );
            }

            cursor = placeholderIndex + placeholder.length;
        });

        const tail = body.slice(cursor);
        if (tail.trim()) {
            segments.push(<div key="html-tail" dangerouslySetInnerHTML={{__html: tail}}/>);
        }

        return segments;
    }

    function renderPageDetail() {
        if (!pageContent) {
            return null;
        }

        return (
                <div className="content-section page-detail">
                    <Title level={2}>{pageContent.title}</Title>
                    {pageContent.published && (
                            <Paragraph type="secondary">
                                Julkaistu {new Date(pageContent.published).toLocaleString()} - {pageContent.creator}
                            </Paragraph>
                    )}
                    <ShowSubjects subjects={pageContent.subjects}/>
                    {renderPageBody(pageContent.body, pageContent.embeds)}
                </div>
        );
    }

    const pageList = useMemo(() => (
            <div className="content-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Title level={3}>Sivut</Title>
                    <Input.Search
                            placeholder="Search pages"
                            value={searchInput}
                            onChange={(e) => onSearchInputChange(e.target.value)}
                            onSearch={onSearchSubmit}
                            style={{maxWidth: 300}}
                    />
                </div>
                <Paragraph>Viimeisimmät sivut</Paragraph>
                <Row gutter={[16, 16]} className="card-grid">
                    {pages.map((page) => (
                            <Col key={page.id} xs={24} sm={12} lg={8} xl={6} className="card-column">
                                <div className="card">
                                    <Title level={4}>{page.title}</Title>
                                    <Paragraph type="secondary">{page.path}</Paragraph>
                                    <Paragraph ellipsis={{rows: 3}}>{page.header}</Paragraph>
                                    {page.subjects && <ShowSubjects subjects={page.subjects}/>}
                                    {page.aclId && <Paragraph type="warning">Pääsy rajoitettu</Paragraph>}
                                </div>
                            </Col>
                    ))}
                </Row>
                <Pagination
                        current={pagination.page + 1}
                        pageSize={pagination.size}
                        total={pagination.total_elements}
                        onChange={(pageNumber) => onPageChange(pageNumber - 1)}
                        pageSizeOptions={[10, 20, 30, 40, 50]}
                        showSizeChanger={false}
                />
            </div>
    ), [pages, pagination.page, pagination.size, pagination.total_elements, searchInput, onSearchInputChange, onSearchSubmit, onPageChange]);

    if (pageContent) {
        return renderPageDetail();
    }

    if (pageStatus === 401) {
        return <div className="content-section"><Paragraph type="warning">Kirjaudu nähdäksesi tämän sivun.</Paragraph></div>;
    }
    if (pageStatus === 403) {
        return <div className="content-section"><Paragraph type="danger">Pääsy kielletty.</Paragraph></div>;
    }
    if (pageError) {
        return <div className="content-section"><Paragraph type="danger">{pageError}</Paragraph></div>;
    }

    return pageList;
}

export default PageView;
