declare module 'react-player' {
    import type {ComponentType} from 'react';

    export interface ReactPlayerProps {
        src: string;
        controls?: boolean;
        width?: string | number;
        height?: string | number;

        [key: string]: unknown;
    }

    const ReactPlayer: ComponentType<ReactPlayerProps>;
    export default ReactPlayer;
}

