export interface DirectoryNode {
    title: string;
    key: string;
    is_leaf?: boolean;
    children?: DirectoryNode[];
}

