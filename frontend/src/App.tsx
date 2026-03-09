import {Button, ConfigProvider, Form, Input, Layout, message, Modal, Select, Space, Tabs, Typography} from 'antd';
import './App.css';
import {useAuth, useTheme} from './context';
import {BottomFooter, SideBar, TopBar} from './components';
import type {WebSitePageDirectory, WebSiteSubject} from './models';
import {pageAPI, subjectSearchAPI, webSiteConfigurationAPI} from './services';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {GalleryRoute} from './pages/GalleryRoute';
import {GalleriesRoute} from './pages/GalleriesRoute';
import {PagesRoute} from './pages/PagesRoute';
import {SearchRoute} from './pages/SearchRoute';
import {toDirectoryIndexFrontendPath, toFrontendPagePath, topDirectoryFromPagesPath} from './tools';

const {Content} = Layout;
const {Title, Paragraph} = Typography;

const DEFAULT_PAGE_PATH = 'index';
const DEFAULT_SITE_CONFIG = {name: 'Vempain', description: 'Vempain'};

function App() {
    const {login, hideLogin, loginVisible} = useAuth();
    const {antdTheme} = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [directories, setDirectories] = useState<WebSitePageDirectory[]>([]);
    const [loading, setLoading] = useState(false);
    const [siteConfig, setSiteConfig] = useState(DEFAULT_SITE_CONFIG);
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [subjectOptions, setSubjectOptions] = useState<WebSiteSubject[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

    const selectedDirectory = useMemo(
            () => topDirectoryFromPagesPath(location.pathname),
            [location.pathname]
    );

    async function handleLogin() {
        setLoading(true);
        setError('');
        const result = await login(username, password);
        setLoading(false);
        if (!result.success) {
            setError(result.error || 'Login failed');
            message.error(result.error || 'Login failed');
        } else {
            message.success('Logged in successfully');
        }
    }

    const handleDirectoryClick = useCallback((directory: string) => {
        navigate(toDirectoryIndexFrontendPath(directory));
    }, [navigate]);

    const handlePagePathSelect = useCallback((path: string) => {
        navigate(toFrontendPagePath(path));
    }, [navigate]);

    const handleSubjectAutocomplete = useCallback(async (term: string) => {
        if (term.length < 3) {
            return;
        }
        try {
            const resp = await subjectSearchAPI.autocomplete(term);
            if (resp.data) {
                setSubjectOptions(resp.data);
            }
        } catch {
            // ignore autocomplete errors
        }
    }, []);

    const handleSubjectSearchAndClose = useCallback(() => {
        const param = selectedSubjects.join(',');
        navigate(`/search?subjects=${encodeURIComponent(param)}`);
        setSearchModalVisible(false);
    }, [navigate, selectedSubjects]);

    useEffect(() => {
        let active = true;

        pageAPI.getPublicPageDirectories()
                .then((response) => {
                    if (!active || !response.data) {
                        return;
                    }
                    setDirectories(response.data);
                })
                .catch((err) => {
                    console.error('Failed to load page directories', err);
                });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (location.pathname === '/' || location.pathname === '') {
            navigate(toFrontendPagePath(DEFAULT_PAGE_PATH), {replace: true});
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        let isMounted = true;
        void (async () => {
            try {
                const response = await webSiteConfigurationAPI.getAll();
                if (!isMounted || !response.data) {
                    return;
                }

                setSiteConfig({
                    name: response.data['site.name'] ?? DEFAULT_SITE_CONFIG.name,
                    description: response.data['site.description'] ?? DEFAULT_SITE_CONFIG.description,
                });
            } catch (err) {
                console.error('Failed to load site configuration', err);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <ConfigProvider theme={antdTheme}>
            <Layout className="app-layout">
                <TopBar
                        selectedDirectory={selectedDirectory}
                        directories={directories}
                        onDirectoryClick={handleDirectoryClick}
                        onShowSearch={() => setSearchModalVisible(true)}
                />
                <div className="app-main">
                    <SideBar
                            siteName={siteConfig.name}
                            siteDescription={siteConfig.description}
                            selectedDirectory={selectedDirectory}
                            onPagePathSelect={handlePagePathSelect}
                    />
                    <Content className="app-content">
                        <Routes>
                            <Route path="/pages/*" element={<PagesRoute/>}/>
                            <Route path="/search" element={<SearchRoute/>}/>
                            <Route path="/galleries" element={<GalleriesRoute/>}/>
                            <Route path="/galleries/:galleryId" element={<GalleryRoute/>}/>
                            <Route path="*" element={<Navigate to={toFrontendPagePath(DEFAULT_PAGE_PATH)} replace/>}/>
                        </Routes>
                        <BottomFooter/>
                    </Content>
                </div>
                <Modal
                        title="Kirjautuminen"
                        open={loginVisible}
                        onCancel={() => {
                            setError('');
                            hideLogin();
                        }}
                        footer={null}
                        destroyOnHidden
                >
                    <div className="login-modal">
                        <Title level={4}>Kirjaudu</Title>
                        <Form layout="vertical" onFinish={handleLogin}>
                            <Form.Item label="Käyttäjänimi" required>
                                <Input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="käyttäjänimi"
                                />
                            </Form.Item>
                            <Form.Item label="Salasana" required>
                                <Input.Password
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Salasana"
                                />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading} block>
                                    Kirjaudu sisään
                                </Button>
                            </Form.Item>
                            {error && <Paragraph type="danger">{error}</Paragraph>}
                        </Form>
                    </div>
                </Modal>
                <Modal
                        title="Etsi"
                        open={searchModalVisible}
                        onCancel={() => setSearchModalVisible(false)}
                        footer={null}
                        width={720}
                >
                    <Tabs
                            defaultActiveKey="subjects"
                            items={[
                                {
                                    key: 'subjects',
                                    label: 'Tunnisteet',
                                    children: (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                                                <Space
                                                        orientation="horizontal"
                                                        size={8}
                                                        style={{marginBottom: 8, width: '100%', display: 'flex', gap: 8}}
                                                >
                                                    <Select
                                                            mode="multiple"
                                                            placeholder="Kirjoita vähintään 3 kirjainta etsiäksesi tunnisteita"
                                                            showSearch={{onSearch: handleSubjectAutocomplete, filterOption: false}}
                                                            value={selectedSubjects}
                                                            onChange={(vals) => setSelectedSubjects(vals as number[])}
                                                            options={subjectOptions.map((s: WebSiteSubject) => ({label: s.subject, value: s.id}))}
                                                            style={{flex: 1, minWidth: 400}}
                                                    />
                                                    <Button
                                                            type="primary"
                                                            onClick={handleSubjectSearchAndClose}
                                                            disabled={selectedSubjects.length === 0}
                                                    >
                                                        Etsi tunnisteiden mukaan
                                                    </Button>
                                                </Space>
                                            </div>
                                    ),
                                },
                            ]}
                    />
                </Modal>
            </Layout>
        </ConfigProvider>
    );
}

export default App;
