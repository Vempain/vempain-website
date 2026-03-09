import ReactPlayer from 'react-player';

interface YouTubeEmbedProps {
    url: string;
}

export function YouTubeEmbed({url}: YouTubeEmbedProps) {
    return (
            <div style={{width: '100%', maxWidth: '100%'}}>
                <div style={{width: '100%', aspectRatio: '16 / 9'}}>
                    <ReactPlayer
                            src={url}
                            controls
                            width="100%"
                            height="100%"
                    />
                </div>
            </div>
    );
}

