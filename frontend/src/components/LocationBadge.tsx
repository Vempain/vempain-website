import {EnvironmentOutlined} from '@ant-design/icons';

interface LocationBadgeProps {
    visible: boolean;
}

export function LocationBadge({visible}: LocationBadgeProps) {
    if (!visible) {
        return null;
    }

    return (
        <div
            style={{
                position: 'absolute',
                right: 6,
                bottom: 6,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                zIndex: 3,
                pointerEvents: 'none',
            }}
            aria-label="Has location"
            title="Has location"
        >
            <EnvironmentOutlined style={{fontSize: 12, lineHeight: 1}} />
        </div>
    );
}
