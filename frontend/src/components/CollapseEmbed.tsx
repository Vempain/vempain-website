import {Collapse} from 'antd';
import type {EmbedItem} from '../models/PageEmbed.ts';

interface CollapseEmbedProps {
    items: EmbedItem[];
}

export function CollapseEmbed({items}: CollapseEmbedProps) {
    const collapseItems = items.map((item, index) => ({
        key: String(index),
        label: item.title,
        children: <div dangerouslySetInnerHTML={{__html: item.body}}/>,
    }));

    return <Collapse items={collapseItems}/>;
}
