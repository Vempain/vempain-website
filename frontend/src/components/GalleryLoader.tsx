import {useEffect, useState} from 'react';
import type {WebSiteFile} from '../models';
import {galleryAPI} from '../services';
import {Spin} from "antd";
import {GalleryBlock} from "./GalleryBlock.tsx";

interface GalleryLoaderProps {
    galleryId: number;
    title?: string;
}

export function GalleryLoader({galleryId, title}: GalleryLoaderProps) {
    const [loading, setLoading] = useState(true);
    const [webSiteFileList, setWebSiteFileList] = useState<WebSiteFile[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [currentSize, setCurrentSize] = useState<number>(25);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [lastPageFetched, setLastPageFetched] = useState<boolean>(false);

    // Reset and fetch first page when gallery changes
    useEffect(() => {
        setLoading(true);
        setWebSiteFileList([]);
        setCurrentPage(0);
        setLastPageFetched(false);
        setTotalElements(0);

        galleryAPI.getGalleryFiles(galleryId, {page: 0, size: currentSize})
                .then((pagedData) => {
                    if (pagedData) {
                        setWebSiteFileList(pagedData.content);
                        setCurrentPage(pagedData.page);
                        setCurrentSize(pagedData.size);
                        setTotalElements(pagedData.total_elements);
                        setLastPageFetched(pagedData.last);
                    }
                })
                .catch((error) => {
                    console.error('Error fetching gallery files:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [galleryId]);

    async function fetchNextPagedData(): Promise<WebSiteFile[]> {
        if (lastPageFetched) {
            return webSiteFileList;
        }

        setLoading(true);
        let combined: WebSiteFile[] = webSiteFileList;

        galleryAPI.getGalleryFiles(galleryId, {page: currentPage + 1, size: currentSize})
                .then((pagedData) => {
                    if (!pagedData) {
                        return;
                    }
                    setWebSiteFileList((prev) => {
                        combined = [...prev, ...pagedData.content];
                        return combined;
                    });
                    setCurrentPage(pagedData.page);
                    setCurrentSize(pagedData.size);
                    setTotalElements(pagedData.total_elements);
                    setLastPageFetched(pagedData.last);
                })
                .catch((error) => {
                    console.error('Error fetching updates to gallery files:', error);
                })
                .finally(() => {
                    setLoading(false);
                });

        return combined;
    }

    return (
            <Spin spinning={loading}>
                <GalleryBlock
                        title={title ?? `Gallery #${galleryId}`}
                        siteFileList={webSiteFileList}
                        totalFiles={totalElements}
                        hasMore={!lastPageFetched}
                        fetchMoreFiles={fetchNextPagedData}
                />
            </Spin>
    );
}
