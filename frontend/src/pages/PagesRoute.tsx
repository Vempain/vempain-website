import {Empty, Spin, Typography} from 'antd';
import {useEffect, useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import PageView from '../components/PageView';
import {type PageCardItem, PageCardsGrid} from '../components/PageCardsGrid';
import type {WebSitePage} from '../models';
import {pageAPI} from '../services';
import {toBackendPagePath, trimSlashes} from '../tools';

const {Paragraph, Title} = Typography;

interface RouteLoadResult {
    routeKey: string;
    pageContent: WebSitePage | null;
    pageError: string | null;
    pageStatus: number | null;
    fallbackPages: WebSitePage[];
}

export function PagesRoute() {
    const {'*': pagePathParam} = useParams();
    const routePath = pagePathParam && pagePathParam.trim() !== '' ? pagePathParam : 'index';
    const backendPath = toBackendPagePath(routePath);

    const [result, setResult] = useState<RouteLoadResult | null>(null);

    useEffect(() => {
        let active = true;

        pageAPI.getPageContent(backendPath)
                .then(async (response) => {
                    if (!active) return;

                    if (response.data) {
                        setResult({
                            routeKey: backendPath,
                            pageContent: response.data,
                            pageError: null,
                            pageStatus: null,
                            fallbackPages: [],
                        });
                        return;
                    }

                    let fallbackPages: WebSitePage[] = [];
                    if (response.status === 404 && backendPath.endsWith('/index')) {
                        const directory = trimSlashes(backendPath.slice(0, -('/index'.length)));
                        const pageResp = await pageAPI.getPublicPages({directory, page: 0, size: 12});
                        if (!active) return;
                        fallbackPages = pageResp.data?.content ?? [];
                    }

                    setResult({
                        routeKey: backendPath,
                        pageContent: null,
                        pageError: response.error ?? null,
                        pageStatus: response.status ?? null,
                        fallbackPages,
                    });
                })
                .catch((err) => {
                    if (!active) return;
                    setResult({
                        routeKey: backendPath,
                        pageContent: null,
                        pageError: err instanceof Error ? err.message : 'Failed to load page',
                        pageStatus: null,
                        fallbackPages: [],
                    });
                });

        return () => {
            active = false;
        };
    }, [backendPath]);

    const loading = result === null || result.routeKey !== backendPath;
    const fallbackItems = useMemo<PageCardItem[]>(
            () => (result?.fallbackPages ?? []).map((page) => ({
                id: page.id,
                title: page.title,
                filePath: page.file_path ?? page.path ?? 'index',
                summary: page.header,
                published: page.published ?? null,
            })),
            [result]
    );

    if (loading) {
        return <Spin/>;
    }

    if (result?.pageContent) {
        return (
                <PageView
                        pageContent={result.pageContent}
                        pages={[]}
                        pagination={{page: 0, size: 12, total_elements: 0}}
                        searchInput=""
                        onSearchInputChange={() => undefined}
                        onSearchSubmit={() => undefined}
                        onPageChange={() => undefined}
                />
        );
    }

    if (fallbackItems.length > 0) {
        return (
                <div className="content-section">
                    <Title level={3}>Latest Pages</Title>
                    <PageCardsGrid items={fallbackItems}/>
                </div>
        );
    }

    if (result?.pageStatus === 401) {
        return <div className="content-section"><Paragraph type="warning">Kirjaudu nähdäksesi tämän sivun.</Paragraph></div>;
    }
    if (result?.pageStatus === 403) {
        return <div className="content-section"><Paragraph type="danger">Pääsy kielletty.</Paragraph></div>;
    }
    if (result?.pageError) {
        return <div className="content-section"><Paragraph type="danger">{result.pageError}</Paragraph></div>;
    }

    return <Empty description="Page not found"/>;
}
