import {Button, Card, Empty, Image, Spin, Tooltip, Typography} from "antd";
import {ShowSubjects} from "./ShowSubjects.tsx";
import {fileAPI} from "../services";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {MetadataEntry, WebSiteFile, WebSiteLocation, WebSiteSubject} from "../models";
import {MetadataOverlay} from "./MetadataOverlay.tsx";
import {LocationBadge} from "./LocationBadge";
import {LocationModal} from "./LocationModal";

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
    isAuthenticated?: boolean;
}

export function GalleryBlock({title, siteFileList, totalFiles, gallerySubjects, hasMore, fetchMoreFiles, isAuthenticated}: GalleryBlockProps) {
    const [previewVisible, setPreviewVisible] = useState<boolean>(false);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [showMetadata, setShowMetadata] = useState<boolean>(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<WebSiteLocation | null>(null);
    const prefetchingRef = useRef(false);

    const handlePreviewVisibleChange = (visible: boolean) => {
        setPreviewVisible(visible);
        if (!visible) {
            setShowMetadata(false);
        }
    };

    const handlePreviewChange = (index: number) => {
        setPreviewIndex(index);
        setShowMetadata(false);
    };

    const stableFetchMore = useCallback(() => fetchMoreFiles(), [fetchMoreFiles]);

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
            {label: 'Kuvausaika', value: (activeFile.originalDateTime !== null ? activeFile.originalDateTime : "")},
            {label: 'Oikeuksien haltija', value: activeFile.rightsHolder},
            {label: 'Käyttöehdot', value: activeFile.rightsTerms},
            {label: 'Oikeuksien verkko-osoite', value: activeFile.rightsUrl},
            {label: 'Tekijä', value: activeFile.creatorName},
            {label: 'Tekijän sähköposti', value: activeFile.creatorEmail},
            {label: 'Tekijän maa', value: activeFile.creatorCountry},
            {label: 'Tekijän verkko-osoite', value: activeFile.creatorUrl},
        ];

        return rawEntries.flatMap((entry) => {
            const normalized = entry.value?.toString().trim();
            if (!normalized) {
                return [];
            }
            return [{label: entry.label, value: normalized}];
        });
    }, [activeFile]);

    // Prefetch next page when near the end of the current set
    useEffect(() => {
        if (!previewVisible || !hasMore) return;
        if (prefetchingRef.current) return;
        if (previewIndex < siteFileList.length - 2) return;

        prefetchingRef.current = true;
        stableFetchMore()
            .catch(() => { /* ignore errors */ })
            .finally(() => {
                prefetchingRef.current = false;
            });
    }, [previewVisible, previewIndex, siteFileList.length, hasMore, stableFetchMore]);

    return (
        <Card size="small" className="gallery-embed">
            {title && <Typography.Text strong>{title}</Typography.Text>}
            <ShowSubjects subjects={gallerySubjects}/>
            <div style={{marginTop: 8}}>
                {siteFileList.length === 0 && <Spin/>}
                {siteFileList.length === 0 && (
                    <Empty description="No images"/>
                )}
                {siteFileList.length > 0 && (
                    <Image.PreviewGroup
                        preview={{
                            open: previewVisible,
                            onOpenChange: handlePreviewVisibleChange,
                            current: previewIndex,
                            onChange: handlePreviewChange,
                            movable: true,
                            countRender: (current, total) => `${current + 1} / ${totalFiles ?? total}`,
                            actionsRender: (original) => (
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
                                const imagePath = fileAPI.getFileUrl(siteFile.filePath);
                                const thumbPath = fileAPI.getFileThumbUrl(imagePath);
                                const hasLocation = Boolean(isAuthenticated) && siteFile.location != null;

                                return (
                                    <Tooltip
                                        key={`galleryfile-${siteFile.id}`}
                                        placement="top"
                                        styles={{container: {padding: 0, background: '#000'}}}
                                        title={
                                            <img
                                                src={thumbPath}
                                                alt={siteFile.filePath}
                                                style={{
                                                    maxWidth: THUMB_TOOLTIP_MAX_WIDTH,
                                                    maxHeight: THUMB_TOOLTIP_MAX_HEIGHT,
                                                    display: 'block',
                                                }}
                                            />
                                        }
                                    >
                                        <div
                                            style={{...THUMBNAIL_FRAME_STYLE, position: 'relative'}}
                                            onClick={() => {
                                                setPreviewIndex(idx);
                                                setPreviewVisible(true);
                                            }}
                                        >
                                            <LocationBadge
                                                visible={hasLocation}
                                                onClick={
                                                    hasLocation
                                                        ? () => {
                                                            setSelectedLocation(siteFile.location!);
                                                            setLocationModalOpen(true);
                                                        }
                                                        : undefined
                                                }
                                            />
                                            <Image
                                                src={thumbPath}
                                                alt={siteFile.filePath}
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
                        <Button type="primary" onClick={stableFetchMore} disabled={!hasMore}>
                            Lataa lisää
                        </Button>
                    </div>
                )}
            </div>
            {previewVisible && showMetadata && (metadataEntries.length > 0 || (activeFile?.subjects?.length ?? 0) > 0) && (
                <MetadataOverlay entries={metadataEntries} subjects={activeFile?.subjects}/>
            )}
            {selectedLocation && (
                <LocationModal
                    key={selectedLocation.id}
                    open={locationModalOpen}
                    location={selectedLocation}
                    onClose={() => {
                        setLocationModalOpen(false);
                        setSelectedLocation(null);
                    }}
                />
            )}
        </Card>
    );
}
