export interface EmbedItem {
    title: string;
    body: string;
}

export interface PageEmbed {
    type: string;
    embedId?: number;
    placeholder?: string;
    autoplay?: boolean;
    dotDuration?: boolean;
    speed?: number;
    items?: EmbedItem[];
}