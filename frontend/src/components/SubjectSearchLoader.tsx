import {Col, Divider, Empty, Row, Spin, Typography} from "antd";
import {useEffect, useMemo, useState} from "react";
import type {WebSiteFile, WebSiteGallery, WebSitePage} from "../models";
import {subjectSearchAPI} from "../services";
import {GalleryBlock} from "./GalleryBlock";

const {Title, Paragraph} = Typography;

interface SubjectSearchProps {
    subjectIdList: number[];
}

export function SubjectSearchLoader({subjectIdList}: SubjectSearchProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [pages, setPages] = useState<WebSitePage[]>([]);
    const [galleries, setGalleries] = useState<WebSiteGallery[]>([]);
    const [files, setFiles] = useState<WebSiteFile[]>([]);
    const [filesPage, setFilesPage] = useState<number>(0);
    const [filesSize, setFilesSize] = useState<number>(25);
    const [filesTotal, setFilesTotal] = useState<number>(0);
    const [filesHasMore, setFilesHasMore] = useState<boolean>(false);

    // Initial fetch on subject change
    useEffect(() => {
        if (subjectIdList.length === 0) {
            setPages([]);
            setGalleries([]);
            setFiles([]);
            setFilesPage(0);
            setFilesTotal(0);
            setFilesHasMore(false);
            return;
        }

        setLoading(true);
        subjectSearchAPI.searchByIds({subjectIds: subjectIdList, page: 0, size: filesSize})
                .then((data) => {
                    if (!data) {
                        setPages([]);
                        setGalleries([]);
                        setFiles([]);
                        setFilesTotal(0);
                        setFilesHasMore(false);
                        return;
                    }
                    setPages(data.pages?.content ?? []);
                    setGalleries(data.galleries?.content ?? []);
                    const incomingFiles = data.files?.content ?? [];
                    setFiles(incomingFiles);
                    setFilesPage(data.files?.page ?? 0);
                    setFilesSize(data.files?.size ?? filesSize);
                    setFilesTotal(data.files?.total_elements ?? incomingFiles.length);
                    setFilesHasMore(!(data.files?.last ?? true));
                })
                .catch((error) => {
                    console.error("Subject search failed:", error);
                })
                .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subjectIdList.join(",")]);

    // Fetch next page of files for GalleryBlock
    function fetchMoreFiles(): Promise<WebSiteFile[]> {
        if (!filesHasMore) {
            return Promise.resolve(files);
        }
        const nextPage = filesPage + 1;
        return subjectSearchAPI.searchByIds({subjectIds: subjectIdList, page: nextPage, size: filesSize})
                .then((data) => {
                    if (!data?.files) {
                        setFilesHasMore(false);
                        return files;
                    }
                    const incoming = data.files.content ?? [];
                    const combined = [...files, ...incoming];
                    setFiles(combined);
                    setFilesPage(data.files.page ?? nextPage);
                    setFilesSize(data.files.size ?? filesSize);
                    setFilesTotal(data.files.total_elements ?? combined.length);
                    setFilesHasMore(!(data.files.last ?? true));
                    return combined;
                })
                .catch((error) => {
                    console.error("Error fetching additional files:", error);
                    return files;
                });
    }

    const sections = useMemo(() => {
        const list: Array<{
            key: "pages" | "galleries" | "files";
            count: number;
            render: () => React.ReactNode;
        }> = [];

        const pageCount = pages.length;
        if (pageCount > 0) {
            list.push({
                key: "pages",
                count: pageCount,
                render: () => (
                        <>
                            <Title level={3}>Pages</Title>
                            <Row gutter={[16, 16]}>
                                {pages.map((page) => (
                                        <Col key={`subject-page-${page.id}`} span={24}>
                                            <Title level={4} style={{marginBottom: 4}}>{page.title}</Title>
                                            <Paragraph type="secondary">{page.path}</Paragraph>
                                            <Paragraph ellipsis={{rows: 3}}>{page.header}</Paragraph>
                                        </Col>
                                ))}
                            </Row>
                        </>
                ),
            });
        }

        const galleryCount = galleries.length;
        if (galleryCount > 0) {
            list.push({
                key: "galleries",
                count: galleryCount,
                render: () => (
                        <>
                            <Title level={3}>Galleries</Title>
                            <Row gutter={[16, 16]}>
                                {galleries.map((gallery) => (
                                        <Col key={`subject-gallery-${gallery.id}`} span={24}>
                                            <Title level={4} style={{marginBottom: 4}}>
                                                {gallery.shortname || `Gallery #${gallery.galleryId}`}
                                            </Title>
                                            <Paragraph>{gallery.description}</Paragraph>
                                        </Col>
                                ))}
                            </Row>
                        </>
                ),
            });
        }

        const fileCount = filesTotal || files.length;
        if (fileCount > 0) {
            list.push({
                key: "files",
                count: fileCount,
                render: () => (
                        <>
                            <Title level={3}>Files</Title>
                            <GalleryBlock
                                    title="Files"
                                    siteFileList={files}
                                    totalFiles={filesTotal || files.length}
                                    gallerySubjects={[]}
                                    hasMore={filesHasMore}
                                    fetchMoreFiles={fetchMoreFiles}
                            />
                        </>
                ),
            });
        }

        // Sort descending by count
        return list.sort((a, b) => b.count - a.count);
    }, [fetchMoreFiles, files, filesHasMore, filesTotal, galleries, pages]);

    if (loading) {
        return <Spin/>;
    }

    if (sections.length === 0) {
        return <Empty description="No results"/>;
    }

    return (
            <div className="content-section">
                {sections.map((section) => (
                        <div key={section.key} style={{marginTop: 12}}>
                            <Divider orientation="horizontal"/>
                            {section.render()}
                        </div>
                ))}
            </div>
    );
}
