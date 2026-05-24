import {Col, Input, Pagination, Row, Typography} from 'antd';
import {useMemo} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import {GalleryLoader, ShowSubjects} from './index';
import type {WebSitePage} from '../models';
import {toFrontendPagePath} from '../tools';
import dayjs from "dayjs";
import {PageBodyRenderer} from '@vempain/vempain-rt-renderer';

const {Title, Paragraph} = Typography;

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
                    <PageBodyRenderer
                            body={pageContent.body}
                            pageTitle={pageContent.title}
                            renderGallery={(galleryId: number, index: number) => (
                                    <GalleryLoader key={`gallery-${galleryId}-${index}`} galleryId={galleryId}/>
                            )}
                    />
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
