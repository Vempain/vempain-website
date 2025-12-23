import {Button, Card, Empty, Image, Spin, Tooltip, Typography} from "antd";
import {ShowSubjects} from "./ShowSubjects.tsx";
import {fileAPI} from "../services";
import {useEffect, useMemo, useRef, useState} from "react";
import type {MetadataEntry, WebSiteFile, WebSiteSubject} from "../models";
import {MetadataOverlay} from "./MetadataOverlay.tsx";

const THUMB_WIDTH = 250;
const THUMB_HEIGHT = 166;
const THUMB_TOOLTIP_MAX_WIDTH = 500;
const THUMB_TOOLTIP_MAX_HEIGHT = 400;
const MAX_COLUMNS = 5;

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

interface GalleryBlockProps {
    title: string;
    siteFileList: (WebSiteFile[]);
    totalFiles: number;
    gallerySubjects?: WebSiteSubject[];
    hasMore: boolean;
    fetchMoreFiles: () => Promise<WebSiteFile[]>;
}

export function GalleryBlock({title, siteFileList, totalFiles, gallerySubjects, hasMore, fetchMoreFiles}: GalleryBlockProps) {
    const [previewVisible, setPreviewVisible] = useState<boolean>(false);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [showMetadata, setShowMetadata] = useState<boolean>(false);
    const prefetchingRef = useRef(false);

    // Memos
    const activeFile = useMemo(() => previewVisible ? siteFileList[previewIndex] ?? null : null, [siteFileList, previewIndex, previewVisible]);
    const columnsStyle = useMemo(() => ({
        display: 'grid',
        gridTemplateColumns: `repeat(${MAX_COLUMNS}, minmax(${THUMB_WIDTH}px, 1fr))`,
        gap: 12,
    }), []);

    const metadataEntries = useMemo<MetadataEntry[]>(() => {
        if (!activeFile) {
            return [];
        }

        const rawEntries = [
            {label: 'Kommentti', value: activeFile.comment},
            {label: 'Kuvausaika', value: activeFile.originalDateTime},
            {label: 'Oikeuksien haltija', value: activeFile.rightsHolder},
            {label: 'Käyttöehdot', value: activeFile.rightsTerms},
            {label: 'Oikeuksien URL', value: activeFile.rightsUrl},
            {label: 'Tekijä', value: activeFile.creatorName},
            {label: 'Tekijän sähköposti', value: activeFile.creatorEmail},
            {label: 'Tekijän maa', value: activeFile.creatorCountry},
            {label: 'Tekijän URL', value: activeFile.creatorUrl},
        ];

        return rawEntries.flatMap((entry) => {
            const normalized = entry.value?.toString().trim();
            if (!normalized) {
                return [];
            }
            return [{label: entry.label, value: normalized}];
        });
    }, [activeFile]);

    // Reset metadata overlay when preview closes or active file changes
    useEffect(() => {
        if (!previewVisible) {
            setShowMetadata(false);
        }
    }, [previewVisible, activeFile?.id]);

    useEffect(() => {
        if (!previewVisible || !hasMore) return;
        if (prefetchingRef.current) return;
        if (previewIndex < siteFileList.length - 2) return;

        prefetchingRef.current = true;
        fetchMoreFiles()
                .catch(() => {/* ignore errors, caller handles logging */
                })
                .finally(() => {
                    prefetchingRef.current = false;
                });
    }, [previewVisible, previewIndex, siteFileList.length, hasMore, fetchMoreFiles]);

    return (
            <Card size="small" className="gallery-embed">
                {title && <Typography.Text strong>{title}</Typography.Text>}
                <ShowSubjects subjects={gallerySubjects} max={8}/>
                <div style={{marginTop: 8}}>
                    {siteFileList.length === 0 && <Spin/>}
                    {siteFileList.length === 0 && (
                            <Empty description="No images"/>
                    )}
                    {siteFileList.length > 0 && (
                            <Image.PreviewGroup
                                    preview={{
                                        visible: previewVisible,
                                        onVisibleChange: setPreviewVisible,
                                        current: previewIndex,
                                        onChange: (index: number) => setPreviewIndex(index),
                                        movable: true,
                                        countRender: (current, total) => `${current + 1} / ${totalFiles ?? total}`,
                                        toolbarRender: (original) => (
                                                <>
                                                    {(metadataEntries.length > 0 || (activeFile?.subjects?.length ?? 0) > 0) && (
                                                            <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowMetadata((prev) => !prev);
                                                                    }}
                                                                    style={{marginRight: 8}}
                                                            >
                                                                {showMetadata ? 'Piilota lisätiedot' : 'Näytä lisätiedot'}
                                                            </Button>
                                                    )}
                                                    {original}
                                                </>
                                        ),
                                    }}
                            >
                                <div style={columnsStyle}>
                                    {siteFileList.map((siteFile, idx) => {
                                        const imagePath = fileAPI.getFileUrl(siteFile.path);
                                        const thumbPath = fileAPI.getFileThumbUrl(imagePath);
                                        return (
                                                <Tooltip
                                                        key={`galleryfile-${siteFile.id}`}
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
                    {siteFileList.length > 0 && hasMore && (
                            <div style={{display: 'flex', justifyContent: 'center', marginTop: 16}}>
                                <Button type="primary" onClick={fetchMoreFiles} disabled={!hasMore}>
                                    Lataa lisää
                                </Button>
                            </div>
                    )}
                </div>
                {previewVisible && showMetadata && (metadataEntries.length > 0 || (activeFile?.subjects?.length ?? 0) > 0) && (
                        <MetadataOverlay entries={metadataEntries} subjects={activeFile?.subjects}/>
                )}
            </Card>
    );
}
