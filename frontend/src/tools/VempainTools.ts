import type {DirectoryNode} from "../models";

function trimSlashes(value: string) {
    return value.replace(/^\/+|\/+$/g, '');
}

function toPathSegment(node: DirectoryNode) {
    if (!node.key.includes('/')) {
        return node.key
    }
    const nodeTitle = (node as { title?: unknown }).title
    if (typeof nodeTitle === 'string' && nodeTitle.trim()) {
        return nodeTitle.trim()
    }

    const parts = node.key.split('/')
    return parts[parts.length - 1]
}

export {trimSlashes, toPathSegment};