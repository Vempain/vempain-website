import {Layout, Tooltip, Tree, type TreeProps} from 'antd';
import type {DataNode} from 'antd/es/tree';
import {type Key, useCallback, useEffect, useState} from 'react';
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

function resolveInitialPath(directory: string, tree: DirectoryTreeNode[]): string {
    const normalized = trimSlashes(directory);
    const segments = normalized.split('/');

    let level: DirectoryTreeNode[] = tree;
    let foundNode: DirectoryTreeNode | null = null;

    for (const seg of segments) {
        const next = level.find((n) => trimSlashes(n.fullPath).endsWith(seg));
        if (!next) {
            return normalized.endsWith('/index') ? normalized : `${normalized}/index`;
        }
        foundNode = next;
        level = (next.children as DirectoryTreeNode[]) ?? [];
    }

    if (foundNode?.indexPagePath) {
        return foundNode.indexPagePath;
    }

    return normalized.endsWith('/index') ? normalized : `${normalized}/index`;
}

export function SideBar({
                            siteName,
                            siteDescription,
                            selectedDirectory,
                            onPagePathSelect,
                        }: SideBarProps) {
    const [treeData, setTreeData] = useState<DirectoryTreeNode[]>([]);

    useEffect(() => {
        if (!selectedDirectory) {
            return;
        }

        let active = true;

        pageAPI.getDirectoryTree(selectedDirectory)
                .then(async (response) => {
                    if (!active) return;

                    if (response.data) {
                        const tree = buildTreeNodes(response.data, selectedDirectory);
                        setTreeData(tree);
                        await onPagePathSelect(resolveInitialPath(selectedDirectory, tree));
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
    }, [selectedDirectory, onPagePathSelect]);

    const handleTreeSelect: TreeProps['onSelect'] = useCallback(async (keys: Key[], info: { node: DataNode }) => {
        if (keys.length === 0) {
            return;
        }

        const node = info.node as unknown as DirectoryTreeNode;
        const targetPath = node.isDirectory ? node.indexPagePath : node.fullPath;
        if (!targetPath) {
            return;
        }

        await onPagePathSelect(targetPath);
    }, [onPagePathSelect]);

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
                                    onSelect={handleTreeSelect}
                                    style={{whiteSpace: 'nowrap'}}
                            />
                        </div>
                )}
            </Sider>
    );
}
