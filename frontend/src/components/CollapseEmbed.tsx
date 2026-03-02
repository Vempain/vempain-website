import {Collapse} from 'antd';
import type {EmbedItem} from '../models';

interface CollapseEmbedProps {
    items: EmbedItem[];
}

export function CollapseEmbed({items}: CollapseEmbedProps) {
    const collapseItems = items.map((item, idx) => ({
        key: String(idx),
        label: item.title,
        children: <div dangerouslySetInnerHTML={{__html: item.body ?? ''}}/>,
    }));

    return <Collapse items={collapseItems}/>;
}
