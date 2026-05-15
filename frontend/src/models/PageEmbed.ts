export interface EmbedItem {
    title: string;
    body: string;
}

export type LastEmbedType = 'pages' | 'galleries' | 'images' | 'videos' | 'audio' | 'documents';

export interface PageEmbed {
    type: string;
    embed_id?: number;
    identifier?: string;
    placeholder?: string;
    autoplay?: boolean;
    dot_duration?: boolean;
    speed?: number;
    /** Inline items for collapse/carousel embeds (new JSON format) */
    items?: EmbedItem[];
    youtube_url?: string;
    last_type?: LastEmbedType;
    count?: number;
}