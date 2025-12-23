export interface DirectoryNode {
    title: string;
    key: string;
    isLeaf?: boolean;
    children?: DirectoryNode[];
}

