import {Button, Card, Empty, Image, Spin, Tooltip, Typography} from 'antd';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {fileAPI, galleryAPI} from "../services";
import type {MetadataEntry, WebSiteFile, WebSiteSubject} from "../models";
import {PreviewMetadataOverlay} from "./PreviewMetadataOverlay";
import {ShowSubjects} from "./ShowSubjects";
import type {PagedResponse} from "@vempain/vempain-auth-frontend";

const THUMB_WIDTH = 250;
const THUMB_HEIGHT = 166;
const THUMB_TOOLTIP_MAX_WIDTH = 500;
const THUMB_TOOLTIP_MAX_HEIGHT = 400;
const MAX_COLUMNS = 5;
const PAGE_SIZE = 25;

const THUMBNAIL_FRAME_STYLE = {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    overflow: 'hidden',
    borderRadius: 4,
    background: '#000',
    cursor: 'pointer',
};

const THUMBNAIL_IMAGE_STYLE = {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    objectFit: 'cover' as const,
    objectPosition: 'center' as const,
    display: 'block',
};

interface GalleryEmbedProps {
    galleryId?: number;
    initialPage?: (PagedResponse<WebSiteFile> & { gallerySubjects?: WebSiteSubject[] });
    fetchPageFn?: (page: number, size: number) => Promise<(PagedResponse<WebSiteFile> & { gallerySubjects?: WebSiteSubject[] }) | null>;
}

export function GalleryEmbed({galleryId, initialPage, fetchPageFn}: GalleryEmbedProps) {
    const [files, setFiles] = useState<WebSiteFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isFetchingRef = useRef(false);
    const filesLengthRef = useRef(0);
    const pageRef = useRef(1);

    const hasMoreRef = useRef<boolean>(hasMore);
    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    useEffect(() => {
        filesLengthRef.current = files.length;
    }, [files.length]);

    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    useEffect(() => {
        const styleNode = document.createElement('style');
        styleNode.dataset.galleryEmbedPreview = 'true';
        styleNode.textContent = `
            .gallery-embed .ant-image-preview-wrap .ant-image-preview-img {
                max-width: calc(100vw - 64px) !important;
                max-height: calc(100vh - 64px) !important;
            }
            .gallery-embed .preview-metadata-overlay-toggle {
                bottom: 31px;
            }
        `;
        document.head.appendChild(styleNode);
        return () => {
            document.head.removeChild(styleNode);
        };
    }, []);

    const columnsStyle = useMemo(() => ({
        display: 'grid',
        gridTemplateColumns: `repeat(${MAX_COLUMNS}, minmax(${THUMB_WIDTH}px, 1fr))`,
        gap: 12,
    }), []);

    const [gallerySubjects, setGallerySubjects] = useState<WebSiteSubject[]>([]);
    const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null);

    const fetchPage = useCallback(async (nextPage: number, reset = false) => {
        if (isFetchingRef.current || (!reset && !hasMoreRef.current)) {
            return;
        }
        isFetchingRef.current = true;
        setLoading(true);
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const pageSize = pageSizeOverride ?? PAGE_SIZE;
        try {
            let pageData: (PagedResponse<WebSiteFile> & { gallerySubjects?: WebSiteSubject[] }) | null = null;
            if (fetchPageFn) {
                pageData = await fetchPageFn(nextPage, pageSize);
            } else if (galleryId !== undefined) {
                const galleryFilesResult = await galleryAPI.getGalleryFiles(galleryId, {page: nextPage, size: pageSize});
                pageData = galleryFilesResult.data ?? null;
            }

            if (controller.signal.aborted) {
                return;
            }
            if (pageData) {
                const incomingItems = pageData.content ?? [];
                const totalItems = pageData.total_elements ?? null;

                setPageSizeOverride(pageData.size ?? pageSize);
                setGallerySubjects(pageData.gallerySubjects ?? gallerySubjects);
                setFiles((prev) => (reset ? incomingItems : [...prev, ...incomingItems]));
                setPage(nextPage);

                if (totalItems !== null) {
                    const consumed = (pageData.page ?? nextPage) * (pageData.size ?? pageSize) + incomingItems.length;
                    setHasMore(consumed < totalItems);
                } else {
                    setHasMore(incomingItems.length === pageSize);
                }
            } else {
                setHasMore(false);
            }
        } finally {
            if (!controller.signal.aborted) {
                isFetchingRef.current = false;
                setLoading(false);
            }
        }
    }, [fetchPageFn, galleryId, pageSizeOverride, gallerySubjects]);

    const loadMore = useCallback(() => {
        if (isFetchingRef.current || !hasMore) {
            return;
        }
        fetchPage(pageRef.current + 1).catch(() => setHasMore(false));
    }, [fetchPage, hasMore]);

    useEffect(() => {
        setFiles([]);
        setGallerySubjects([]);
        setPage(0);
        setHasMore(true);
        setPageSizeOverride(initialPage?.size ?? null);

        if (initialPage) {
            const pageData = initialPage;
            const incoming = pageData.content ?? [];
            setFiles(incoming);
            setGallerySubjects(pageData.gallerySubjects ?? []);
            const total = pageData.total_elements ?? incoming.length;
            const consumed = (pageData.page ?? 0) * (pageData.size ?? PAGE_SIZE) + incoming.length;
            setHasMore(consumed < total);
            setPage(pageData.page ?? 0);
            pageRef.current = pageData.page ?? 0;
            filesLengthRef.current = incoming.length;
        } else if (galleryId !== undefined) {
            fetchPage(0, true).catch(() => setHasMore(false));
        }

        return () => {
            abortControllerRef.current?.abort();
            isFetchingRef.current = false;
        };
    }, [galleryId, fetchPage, initialPage]);

    const activeFile = useMemo(() => previewVisible ? files[previewIndex] ?? null : null, [files, previewIndex, previewVisible]);

    const metadataEntries = useMemo<MetadataEntry[]>(() => {
        if (!activeFile) {
            return [];
        }

        const rawEntries = [
            {label: 'Comment', value: activeFile.comment},
            {label: 'Original datetime', value: activeFile.originalDateTime},
            {label: 'Rights holder', value: activeFile.rightsHolder},
            {label: 'Rights terms', value: activeFile.rightsTerms},
            {label: 'Rights URL', value: activeFile.rightsUrl},
            {label: 'Creator name', value: activeFile.creatorName},
            {label: 'Creator email', value: activeFile.creatorEmail},
            {label: 'Creator country', value: activeFile.creatorCountry},
            {label: 'Creator URL', value: activeFile.creatorUrl},
        ];

        return rawEntries.flatMap((entry) => {
            const normalized = entry.value?.toString().trim();
            if (!normalized) {
                return [];
            }
            return [{label: entry.label, value: normalized}];
        });
    }, [activeFile]);

    useEffect(() => {
        if (!previewVisible || files.length === 0 || isFetchingRef.current || !hasMoreRef.current) {
            return;
        }
        if (previewIndex >= files.length - 1) {
            fetchPage(pageRef.current + 1).catch(() => setHasMore(false));
        }
    }, [fetchPage, files.length, previewIndex, previewVisible]);

    return (
            <Card size="small" className="gallery-embed" key={`gallery-card-${galleryId}`}>
                <Typography.Text strong>Gallery #{galleryId}</Typography.Text>
                <ShowSubjects subjects={gallerySubjects} max={8}/>
                <div style={{marginTop: 8}}>
                    {files.length === 0 && loading && <Spin/>}
                    {!loading && files.length === 0 && (
                            <Empty description="No images"/>
                    )}
                    {files.length > 0 && (
                            <Image.PreviewGroup
                                    preview={{
                                        visible: previewVisible,
                                        onVisibleChange: setPreviewVisible,
                                        current: previewIndex,
                                        onChange: (index: number) => setPreviewIndex(index),
                                        movable: true,
                                    }}
                            >
                                <div style={columnsStyle}>
                                    {files.map((siteFile, idx) => {
                                        const imagePath = fileAPI.getFileUrl(siteFile.path);
                                        const thumbPath = fileAPI.getFileThumbUrl(imagePath);
                                        return (
                                                <Tooltip
                                                        key={`galleryfile-${galleryId}-${siteFile.id}`}
                                                        placement="top"
                                                        styles={{container: {padding: 0, background: '#000'}}}
                                                        title={
                                                            <img
                                                                    src={thumbPath}
                                                                    alt={siteFile.path}
                                                                    style={{
                                                                        maxWidth: THUMB_TOOLTIP_MAX_WIDTH,
                                                                        maxHeight: THUMB_TOOLTIP_MAX_HEIGHT,
                                                                        display: 'block',
                                                                    }}
                                                            />
                                                        }
                                                >
                                                    <div
                                                            style={THUMBNAIL_FRAME_STYLE}
                                                            onClick={() => {
                                                                setPreviewIndex(idx);
                                                                setPreviewVisible(true);
                                                            }}
                                                    >
                                                        <Image
                                                                src={thumbPath}
                                                                alt={siteFile.path}
                                                                style={THUMBNAIL_IMAGE_STYLE}
                                                                preview={{src: imagePath}}
                                                        />
                                                    </div>
                                                </Tooltip>
                                        );
                                    })}
                                </div>
                            </Image.PreviewGroup>
                    )}
                    {files.length > 0 && hasMore && (
                            <div style={{display: 'flex', justifyContent: 'center', marginTop: 16}}>
                                <Button type="primary" onClick={loadMore} loading={loading && files.length > 0}
                                        disabled={isFetchingRef.current}>
                                    Lataa lisää
                                </Button>
                            </div>
                    )}
                </div>
                {previewVisible && (metadataEntries.length > 0 || (activeFile?.subjects?.length ?? 0) > 0) && (
                        <PreviewMetadataOverlay entries={metadataEntries} subjects={activeFile?.subjects}/>
                )}
            </Card>
    );
}
