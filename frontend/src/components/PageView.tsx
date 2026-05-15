import {Col, Input, Pagination, Row, Typography} from 'antd';
import React, {lazy, Suspense, useMemo} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import {GalleryLoader, ShowSubjects} from './index';
import {ImageEmbed} from './ImageEmbed';
import {HeroEmbed} from './HeroEmbed';
import {CollapseEmbed} from './CollapseEmbed';
import {CarouselEmbed} from './CarouselEmbed';
import {VideoEmbed} from './VideoEmbed';
import {AudioEmbed} from './AudioEmbed';
import {MusicDataEmbed} from './MusicDataEmbed';
import {YouTubeEmbed} from './YouTubeEmbed';
import {LastItemsEmbed} from './LastItemsEmbed';
import type {WebSitePage} from '../models';
import {parseEmbeds, toFrontendPagePath} from '../tools';
import dayjs from "dayjs";

const {Title, Paragraph} = Typography;
const LazyGpsTimeSeriesEmbed = lazy(() => import('./GpsTimeSeriesEmbed'));

interface PageViewProps {
    pageContent: WebSitePage | null;
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
    function renderPageBody(body: string) {
        if (!body) return null;

        // Always parse embeds directly from the body so that every embed tag
        // present in the HTML is discovered – the backend-stored embeds may be
        // stale / incomplete (e.g. only gallery entries from before hero/image
        // support was added).
        const resolvedEmbeds = parseEmbeds(body);

        if (!resolvedEmbeds || resolvedEmbeds.length === 0) {
            return <div dangerouslySetInnerHTML={{__html: body}}/>;
        }

        const segments: React.ReactNode[] = [];
        let cursor = 0;

        resolvedEmbeds.forEach((embed, index) => {
            const placeholder = embed.placeholder ?? `<!--vps:embed:${embed.type}:${embed.embed_id}-->`;
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

            if (embed.type === 'gallery' && embed.embed_id) {
                segments.push(
                        <GalleryLoader key={`gallery-${embed.embed_id}-${index}`} galleryId={embed.embed_id}/>
                );
            } else if (embed.type === 'image' && embed.embed_id) {
                segments.push(
                        <ImageEmbed key={`image-${embed.embed_id}-${index}`} fileId={embed.embed_id}/>
                );
            } else if (embed.type === 'hero' && embed.embed_id) {
                segments.push(
                        <HeroEmbed key={`hero-${embed.embed_id}-${index}`} fileId={embed.embed_id} title={pageContent?.title ?? ''}/>
                );
            } else if (embed.type === 'video' && embed.embed_id) {
                segments.push(
                        <VideoEmbed key={`video-${embed.embed_id}-${index}`} fileId={embed.embed_id}/>
                );
            } else if (embed.type === 'audio' && embed.embed_id) {
                segments.push(
                        <AudioEmbed key={`audio-${embed.embed_id}-${index}`} fileId={embed.embed_id}/>
                );
            } else if (embed.type === 'youtube' && embed.youtube_url) {
                segments.push(
                        <YouTubeEmbed key={`youtube-${index}`} url={embed.youtube_url}/>
                );
            } else if (embed.type === 'music' && embed.identifier) {
                segments.push(
                        <MusicDataEmbed key={`music-${embed.identifier}-${index}`} identifier={embed.identifier}/>
                );
            } else if (embed.type === 'gps_timeseries' && embed.identifier) {
                segments.push(
                        <Suspense key={`gps-${embed.identifier}-${index}`} fallback={<div>Loading GPS map…</div>}>
                            <LazyGpsTimeSeriesEmbed identifier={embed.identifier}/>
                        </Suspense>
                );
            } else if (embed.type === 'last' && embed.last_type && embed.count) {
                segments.push(
                        <LastItemsEmbed key={`last-${embed.last_type}-${index}`} lastType={embed.last_type} count={embed.count}/>
                );
            } else if (embed.type === 'collapse' && embed.items) {
                segments.push(
                        <CollapseEmbed
                                key={`collapse-${index}`}
                                items={embed.items}
                        />
                );
            } else if (embed.type === 'carousel' && embed.items) {
                segments.push(
                        <CarouselEmbed
                                key={`carousel-${index}`}
                                items={embed.items}
                                autoplay={embed.autoplay ?? false}
                                dotDuration={embed.dot_duration ?? false}
                                speed={embed.speed ?? 500}
                        />
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
                    {pageContent.created && (
                            <Paragraph type={"secondary"}>
                                Julkaistu {dayjs(pageContent.created).format("YYYY-MM-DD hh:mm")} - {pageContent.creator}
                            </Paragraph>
                    )}
                    <ShowSubjects subjects={pageContent.subjects}/>
                    {renderPageBody(pageContent.body)}
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
                                    <Title level={4}>
                                        <RouterLink to={toFrontendPagePath(page.file_path ?? page.path ?? 'index')}>
                                            {page.title}
                                        </RouterLink>
                                    </Title>
                                    <Paragraph type="secondary">{page.file_path ?? page.path ?? ''}</Paragraph>
                                    <Paragraph ellipsis={{rows: 3}}>{page.header}</Paragraph>
                                    {page.subjects && <ShowSubjects subjects={page.subjects}/>}
                                    {page.acl_id && <Paragraph type="warning">Pääsy rajoitettu</Paragraph>}
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
