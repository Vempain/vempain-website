import {EnvironmentOutlined} from '@ant-design/icons';

interface LocationBadgeProps {
    visible: boolean;
    onClick?: () => void;
}

export function LocationBadge({visible, onClick}: LocationBadgeProps) {
    if (!visible) {
        return null;
    }

    const clickable = typeof onClick === 'function';

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
                pointerEvents: clickable ? 'auto' : 'none',
                cursor: clickable ? 'pointer' : undefined,
            }}
            aria-label="Has location"
            title={clickable ? 'Show location' : 'Has location'}
            onClick={(e) => {
                if (!clickable) {
                    return;
                }
                e.stopPropagation();
                onClick();
            }}
        >
            <EnvironmentOutlined style={{fontSize: 12, lineHeight: 1}} />
        </div>
    );
}
