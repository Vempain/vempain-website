import {SearchOutlined} from '@ant-design/icons';
import {Button, Layout, Menu, type MenuProps} from 'antd';
import {useAuth} from '../context';
import type {WebSitePageDirectory} from '../models';

const {Header} = Layout;

interface TopBarProps {
    selectedDirectory: string | null;
    directories: WebSitePageDirectory[];
    onDirectoryClick: (directory: string) => void;
    onShowSearch: () => void;
}

export function TopBar({
                           selectedDirectory,
                           directories,
                           onDirectoryClick,
                           onShowSearch,
                       }: TopBarProps) {
    const {isAuthenticated, logout, showLogin} = useAuth();

    const menuBarItems: MenuProps['items'] = [
        ...directories.map((dir: WebSitePageDirectory) => ({
            key: `dir-${dir.name}`,
            label: (
                    <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                onDirectoryClick(dir.name);
                            }}
                    >
                        {dir.name}
                    </a>
            ),
        })),
        {type: 'divider'},
        {
            key: 'auth',
            label: isAuthenticated ? (
                    <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                logout();
                            }}
                    >
                        Logout
                    </a>
            ) : (
                    <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                showLogin();
                            }}
                    >
                        Login
                    </a>
            ),
        },
        {
            key: 'global-search',
            label: (
                    <Button
                            type="text"
                            icon={<SearchOutlined/>}
                            aria-label="Search"
                            onClick={(e) => {
                                e.preventDefault();
                                onShowSearch();
                            }}
                    />
            ),
        },
    ];

    return (
            <Header
                    className="app-header"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 0px',
                        maxWidth: '100%',
                    }}
            >
                <Menu
                        mode="horizontal"
                        selectedKeys={selectedDirectory ? [`dir-${selectedDirectory}`] : []}
                        items={menuBarItems}
                        style={{width: '100%'}}
                />
            </Header>
    );
}
