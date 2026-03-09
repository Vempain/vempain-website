import {Card, Typography} from 'antd';
import {Link as RouterLink} from 'react-router-dom';
import {toFrontendPagePath} from '../tools';

const {Paragraph, Text, Title} = Typography;

export interface PageCardItem {
    id: number | string;
    title: string;
    filePath: string;
    summary?: string | null;
    published?: string | null;
}

interface PageCardsGridProps {
    items: PageCardItem[];
}

function formatPublished(published?: string | null): string {
    if (!published) {
        return '-';
    }
    const parsed = new Date(published);
    if (Number.isNaN(parsed.valueOf())) {
        return published;
    }
    return parsed.toLocaleDateString();
}

export function PageCardsGrid({items}: PageCardsGridProps) {
    if (items.length === 0) {
        return null;
    }
    return (
            <div
                    style={{
                        display: 'grid',
                        gap: 16,
                        maxWidth: 1648,
                        margin: '0 auto',
                        justifyContent: 'center',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 400px))',
                    }}
            >
                {items.map((item) => (
                        <Card key={item.id}>
                            <Title level={4} style={{marginTop: 0, marginBottom: 8}}>
                                <RouterLink to={toFrontendPagePath(item.filePath)}>{item.title}</RouterLink>
                            </Title>
                            {item.summary ? <Paragraph style={{marginBottom: 8}}>{item.summary}</Paragraph> : null}
                            <Text type="secondary">{formatPublished(item.published)}</Text>
                        </Card>
                ))}
            </div>
    );
}
