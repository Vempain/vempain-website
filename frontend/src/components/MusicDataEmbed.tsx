import {Alert, Input, Space, Table, Typography} from 'antd';
import type {ColumnsType, TablePaginationConfig} from 'antd/es/table';
import type {SorterResult} from 'antd/es/table/interface';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {MusicDataRow} from '../models';
import {pageAPI} from '../services';

interface MusicDataEmbedProps {
    identifier: string;
}

const {Text} = Typography;

const columns: ColumnsType<MusicDataRow> = [
    {title: 'Artist', dataIndex: 'artist', key: 'artist', sorter: true},
    {title: 'Album artist', dataIndex: 'album_artist', key: 'album_artist', sorter: true},
    {title: 'Album', dataIndex: 'album', key: 'album', sorter: true},
    {title: 'Year', dataIndex: 'year', key: 'year', sorter: true, width: 90},
    {title: '#', dataIndex: 'track_number', key: 'track_number', sorter: true, width: 80},
    {title: 'Track', dataIndex: 'track_name', key: 'track_name', sorter: true},
    {title: 'Genre', dataIndex: 'genre', key: 'genre', sorter: true, width: 150},
    {
        title: 'Duration',
        dataIndex: 'duration_seconds',
        key: 'duration_seconds',
        sorter: true,
        width: 120,
        render: (_, record) => {
            if (record.duration_seconds == null) {
                return '-';
            }
            const minutes = Math.floor(record.duration_seconds / 60);
            const seconds = String(record.duration_seconds % 60).padStart(2, '0');
            return `${minutes}:${seconds}`;
        }
    }
];

export function MusicDataEmbed({identifier}: MusicDataEmbedProps) {
    const [rows, setRows] = useState<MusicDataRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState('artist');
    const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        const response = await pageAPI.getMusicData(identifier, {
            page,
            perPage: pageSize,
            sortBy,
            direction,
            search,
        });
        if (response.data) {
            setRows(response.data.items);
            setTotal(response.data.total_elements);
            setLoading(false);
            return;
        }

        setRows([]);
        setTotal(0);
        setError(response.error ?? 'Failed to load music data');
        setLoading(false);
    }, [direction, identifier, page, pageSize, search, sortBy]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            void loadRows();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadRows]);

    const tablePagination = useMemo<TablePaginationConfig>(() => ({
        current: page + 1,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [10, 25, 50, 100],
    }), [page, pageSize, total]);

    return (
            <div style={{margin: '24px 0'}}>
                <Space direction="vertical" size={12} style={{width: '100%'}}>
                    <Typography.Title level={4} style={{margin: 0}}>Music library</Typography.Title>
                    <Input.Search
                            placeholder="Search artist, album, track, genre or year"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            onSearch={() => {
                                setPage(0);
                                setSearch(searchInput.trim());
                            }}
                            allowClear
                            enterButton
                    />
                    {error && <Alert type="error" message={error}/>}
                    <Table<MusicDataRow>
                            rowKey={(record) => record.id}
                            loading={loading}
                            columns={columns}
                            dataSource={rows}
                            pagination={tablePagination}
                            onChange={(pagination, _filters, sorter) => {
                                const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter as SorterResult<MusicDataRow>;
                                setPage((pagination.current ?? 1) - 1);
                                setPageSize(pagination.pageSize ?? 25);
                                if (nextSorter?.field && typeof nextSorter.field === 'string') {
                                    setSortBy(nextSorter.field);
                                    setDirection(nextSorter.order === 'descend' ? 'desc' : 'asc');
                                }
                            }}
                            scroll={{x: true}}
                            size="small"
                    />
                    <Text type="secondary">Showing dataset: {identifier}</Text>
                </Space>
            </div>
    );
}


