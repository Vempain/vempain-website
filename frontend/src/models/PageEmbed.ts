export interface EmbedItem {
    title: string;
    body: string;
}

export type LastEmbedType = 'pages' | 'galleries' | 'images' | 'videos' | 'audio' | 'documents';

export interface PageEmbed {
    type: string;
    embedId?: number;
    identifier?: string;
    placeholder?: string;
    autoplay?: boolean;
    dotDuration?: boolean;
    speed?: number;
    /** Inline items for collapse/carousel embeds (new JSON format) */
    items?: EmbedItem[];
    youtubeUrl?: string;
    lastType?: LastEmbedType;
    count?: number;
}