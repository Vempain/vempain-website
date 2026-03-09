import {Layout, Tooltip, Tree, type TreeProps} from 'antd';
import type {DataNode} from 'antd/es/tree';
import {type Key, useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';
import type {DirectoryNode} from '../models';
import {pageAPI} from '../services';
import {toPathSegment, trimSlashes} from '../tools';

const {Sider} = Layout;

type DirectoryTreeNode = DataNode & {
    fullPath: string;
    isDirectory: boolean;
    indexPagePath?: string;
};

interface SideBarProps {
    siteName: string;
    siteDescription: string;
    selectedDirectory: string | null;
    onPagePathSelect: (path: string) => void | Promise<void>;
}

const buildTreeNodes = (nodes: DirectoryNode[], parentPath: string): DirectoryTreeNode[] =>
        nodes.map((node) => {
            const rawChildren = (node.children ?? []) as DirectoryNode[];
            const fullPath = node.key.includes('/')
                    ? trimSlashes(node.key)
                    : [trimSlashes(parentPath), toPathSegment(node)].filter(Boolean).join('/');
            const childNodes = rawChildren.length > 0 ? buildTreeNodes(rawChildren, fullPath) : [];
            const indexChild = childNodes.find((child) => child.fullPath.endsWith('/index'));
            const filteredChildren = childNodes.filter((child) => !child.fullPath.endsWith('/index'));

            return {
                ...node,
                key: fullPath,
                children: filteredChildren.length ? filteredChildren : undefined,
                fullPath,
                isDirectory: rawChildren.length > 0,
                indexPagePath: indexChild?.fullPath,
                selectable: rawChildren.length > 0 ? Boolean(indexChild) : true,
            };
        });

function findSelectedTreeKey(nodes: DirectoryTreeNode[], currentPagePath: string | null): string[] {
    if (!currentPagePath) {
        return [];
    }

    const stack = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;

        // Exact page node match.
        if (node.fullPath === currentPagePath) {
            return [node.fullPath];
        }

        // Index pages are represented by their directory node in the tree.
        if (node.indexPagePath === currentPagePath) {
            return [node.fullPath];
        }

        const children = (node.children as DirectoryTreeNode[] | undefined) ?? [];
        stack.push(...children);
    }

    return [];
}

export function SideBar({
                            siteName,
                            siteDescription,
                            selectedDirectory,
                            onPagePathSelect,
                        }: SideBarProps) {
    const [treeData, setTreeData] = useState<DirectoryTreeNode[]>([]);
    const location = useLocation();

    const currentPagePath = useMemo(() => {
        const normalized = trimSlashes(location.pathname);
        if (!normalized.startsWith('pages/')) {
            return null;
        }
        return normalized.slice('pages/'.length);
    }, [location.pathname]);

    useEffect(() => {
        if (!selectedDirectory) {
            return;
        }

        let active = true;

        pageAPI.getDirectoryTree(selectedDirectory)
                .then((response) => {
                    if (!active) return;

                    if (response.data) {
                        const tree = buildTreeNodes(response.data, selectedDirectory);
                        setTreeData(tree);
                        return;
                    }

                    setTreeData([]);
                })
                .catch(() => {
                    if (!active) return;
                    setTreeData([]);
                });

        return () => {
            active = false;
        };
    }, [selectedDirectory]);

    const selectedTreeKeys = useMemo(
            () => findSelectedTreeKey(treeData, currentPagePath),
            [treeData, currentPagePath]
    );

    const handleTreeSelect: TreeProps['onSelect'] = useCallback(async (keys: Key[], info: { node: DataNode; nativeEvent?: Event }) => {
        if (keys.length === 0) {
            return;
        }

        // Only react to trusted, user-triggered click events.
        const nativeEvent = info.nativeEvent;
        if (!(nativeEvent instanceof MouseEvent) || !nativeEvent.isTrusted) {
            return;
        }

        const node = info.node as unknown as DirectoryTreeNode;
        const targetPath = node.isDirectory ? node.indexPagePath : node.fullPath;
        if (!targetPath) {
            return;
        }

        if (currentPagePath === targetPath) {
            return;
        }

        await onPagePathSelect(targetPath);
    }, [currentPagePath, onPagePathSelect]);

    return (
            <Sider
                    trigger={null}
                    collapsible
                    collapsed={false}
                    width="auto"
                    style={{flex: '0 0 auto', minWidth: 320, maxWidth: 720}}
                    className="app-sider"
            >
                <Tooltip title={siteDescription}>
                    <div className="logo">{siteName}</div>
                </Tooltip>
                {selectedDirectory && (
                        <div style={{overflowX: 'auto'}}>
                            <Tree
                                    showLine={false}
                                    treeData={treeData}
                                    defaultExpandAll
                                    selectedKeys={selectedTreeKeys}
                                    onSelect={handleTreeSelect}
                                    style={{whiteSpace: 'nowrap'}}
                            />
                        </div>
                )}
            </Sider>
    );
}
