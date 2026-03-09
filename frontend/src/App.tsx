import {Button, Col, ConfigProvider, Form, Input, Layout, message, Modal, Row, Select, Space, Tabs, Typography} from 'antd';
import './App.css';
import {useAuth, useTheme} from './context';
import {BottomFooter, GalleryLoader, PageView, ShowSubjects, SideBar, SubjectSearchLoader, TopBar} from './components';
import type {WebSiteFile, WebSiteGallery, WebSitePage, WebSitePageDirectory, WebSiteSubject} from './models';
import {galleryAPI, pageAPI, subjectSearchAPI, webSiteConfigurationAPI} from './services';
import {useCallback, useEffect, useRef, useState} from 'react';

const {Content} = Layout;
const {Title, Paragraph} = Typography;

const DEFAULT_PAGE_PATH = 'index';
const DEFAULT_SITE_CONFIG = {name: 'Vempain', description: 'Vempain'};

function App() {
    const {login, hideLogin, loginVisible, showLogin} = useAuth();
    const {applyPageStyle, resetToDefault, antdTheme} = useTheme()
    const [activeSection, setActiveSection] = useState('pages')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [pages, setPages] = useState<WebSitePage[]>([])
    const [pagination, setPagination] = useState({page: 0, size: 12, total_elements: 0})
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [files, setFiles] = useState<WebSiteFile[]>([])
    const [galleries, setGalleries] = useState<WebSiteGallery[]>([])
    const [directories, setDirectories] = useState<WebSitePageDirectory[]>([])
    const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [pageContent, setPageContent] = useState<WebSitePage | null>(null)
    const [siteConfig, setSiteConfig] = useState(DEFAULT_SITE_CONFIG)
    const [searchModalVisible, setSearchModalVisible] = useState(false)
    const [subjectOptions, setSubjectOptions] = useState<WebSiteSubject[]>([])
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([])
    const [pageError, setPageError] = useState<string | null>(null)
    const [pageStatus, setPageStatus] = useState<number | null>(null)
    const hasInitialized = useRef(false)

    async function handleLogin() {
        setLoading(true)
        setError('')
        const result = await login(username, password)
        setLoading(false)
        if (!result.success) {
            setError(result.error || 'Login failed')
            message.error(result.error || 'Login failed')
        } else {
            message.success('Logged in successfully')
        }
    }

    const handleLoadSection = useCallback(async (
            section: string,
            override?: { page?: number; search?: string; directory?: string | null }
    ) => {
        setActiveSection(section)
        if (section === 'pages') {
            setPageContent(null)
        }
        setLoading(true)
        setError('')

        try {
            if (section === 'pages') {
                const response = await pageAPI.getPublicPages({
                    page: override?.page ?? pagination.page,
                    size: pagination.size,
                    search: override?.search ?? search,
                    directory: override?.directory ?? selectedDirectory,
                })
                if (response.data) {
                    setPages(response.data.content)
                    setPagination({
                        page: response.data.page,
                        size: response.data.size,
                        total_elements: response.data.total_elements,
                    })
                } else {
                    setError(response.error || 'Failed to load pages')
                }
            } else if (section === 'files') {
                pageAPI.getPublicFiles({page: 0, size: pagination.size})
                        .then((response => {
                            if (response.data) {
                                setFiles(response.data.content);
                            } else {
                                setError(response.error || 'Failed to load files');
                            }
                        }))
                        .catch((error) => {
                            console.log("Error loading files:", error);
                        })
                        .finally(() => {
                            setLoading(false);
                        });
            } else if (section === 'galleries') {
                const response = await galleryAPI.getPublicGalleries()
                if (response.data) {
                    setGalleries(response.data)
                } else {
                    setError(response.error || 'Failed to load galleries')
                }
            }
        } catch (err) {
            const messageText = err instanceof Error ? err.message : 'Failed to load data'
            setError(messageText)
            message.error(messageText)
        } finally {
            setLoading(false)
        }
    }, [pagination.page, pagination.size, search, selectedDirectory])

    const loadDirectories = useCallback(async () => {
        const response = await pageAPI.getPublicPageDirectories()
        if (response.data) {
            setDirectories(response.data)
        }
    }, [])

    // Helpers
    const loadPageContent = useCallback(async (path: string) => {
        setPageError(null)
        setPageStatus(null)
        const response = await pageAPI.getPageContent(path)
        if (response.data) {
            setPageContent(response.data)
        } else {
            setPageContent(null)
            setPageError(response.error ?? null)
            setPageStatus(response.status ?? null)
            if (response.status === 401) {
                showLogin()
            }
        }
    }, [showLogin])

    async function handleDirectoryClick(directory: string) {
        setSelectedDirectory(directory)
        setActiveSection('pages')
        setLoading(true)
        setError('')
        try {
            const pagesResp = await pageAPI.getPublicPages({directory, page: 0})

            if (pagesResp.data) {
                setPages(pagesResp.data.content)
                setPagination({
                    page: pagesResp.data.page,
                    size: pagesResp.data.size,
                    total_elements: pagesResp.data.total_elements,
                })
            } else {
                setError(pagesResp.error || 'Failed to load pages')
            }
        } catch (err) {
            const messageText = err instanceof Error ? err.message : 'Failed to load data'
            setError(messageText)
            message.error(messageText)
        } finally {
            setLoading(false)
        }
    }

    const handleGlobalSearch = useCallback((value: string) => {
        setSearchInput(value)
        setSearch(value)
        handleLoadSection('pages', {page: 1, search: value, directory: selectedDirectory})
    }, [handleLoadSection, selectedDirectory])

    const handleSearchSubmit = useCallback(() => {
        if (!searchInput.trim()) {
            return
        }

        handleGlobalSearch(searchInput)
    }, [handleGlobalSearch, searchInput])

    const handleSubjectAutocomplete = useCallback(async (term: string) => {
        if (term.length < 3) {
            return;
        }
        try {
            const resp = await subjectSearchAPI.autocomplete(term)
            if (resp.data) {
                setSubjectOptions(resp.data)
            }
        } catch {
            // ignore autocomplete errors
        }
    }, [])

    const handleSubjectSearch = useCallback(async () => {
        setActiveSection('search');
    }, []);

    const handleSubjectSearchAndClose = useCallback(() => {
        handleSubjectSearch();
        setSearchModalVisible(false);
    }, [handleSubjectSearch]);

    // React to subject tag clicks emitted from ShowSubjects
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<number[]>).detail;
            if (!Array.isArray(detail) || detail.length === 0) return;
            setSelectedSubjects(detail);
            setActiveSection('search');
            setSearchModalVisible(false);
        };
        window.addEventListener('subject-search-open', handler as EventListener);
        return () => window.removeEventListener('subject-search-open', handler as EventListener);
    }, []);

    useEffect(() => {
        if (hasInitialized.current) {
            return
        }
        hasInitialized.current = true
        handleLoadSection('pages')
        void loadDirectories()
        void loadPageContent(DEFAULT_PAGE_PATH)
    }, [handleLoadSection, loadDirectories, loadPageContent])

    useEffect(() => {
        let isMounted = true
        void (async () => {
            try {
                const response = await webSiteConfigurationAPI.getAll()
                if (!isMounted || !response.data) {
                    return
                }

                setSiteConfig({
                    name: response.data['site.name'] ?? DEFAULT_SITE_CONFIG.name,
                    description: response.data['site.description'] ?? DEFAULT_SITE_CONFIG.description,
                })
            } catch (err) {
                console.error('Failed to load site configuration', err)
            }
        })()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (pageContent) {
            document.title = pageContent.title
        } else {
            document.title = siteConfig.name
        }
    }, [pageContent, siteConfig.name])

    useEffect(() => {
        // Style policy:
        // - If pageContent.style is null/undefined => reset to default style
        // - Else => default style overloaded with page style overrides
        if (!pageContent || pageContent.page_style === null || pageContent.page_style === undefined) {
            resetToDefault()
        } else {
            applyPageStyle(pageContent.page_style)
        }
    }, [applyPageStyle, pageContent, resetToDefault])

    function renderSearchResults() {
        return (
                <SubjectSearchLoader subjectIdList={selectedSubjects}/>
        );
    }

    function renderContent() {
        if (activeSection === 'search') {
            return renderSearchResults();
        }

        if (activeSection === 'pages') {
            return (
                    <PageView
                            pageContent={pageContent}
                            pages={pages}
                            pagination={pagination}
                            searchInput={searchInput}
                            onSearchInputChange={setSearchInput}
                            onSearchSubmit={handleSearchSubmit}
                            onPageChange={(pageNumber) => handleLoadSection('pages', {page: pageNumber})}
                            pageError={pageError}
                            pageStatus={pageStatus}
                    />
            )
        }

        if (activeSection === 'files') {
            return (
                    <div className="content-section">
                        <Title level={3}>Files</Title>
                        <Row gutter={[16, 16]} className="card-grid">
                            {files.map((file: WebSiteFile) => (
                                    <Col key={file.id} xs={24} sm={12} lg={8} xl={6} className="card-column">
                                        <div className="card">
                                            <Title level={4}>{file.filePath}</Title>
                                            <Paragraph type="secondary">{file.mimetype}</Paragraph>
                                            <Paragraph>{file.aclId ?? 'Julkinen'}</Paragraph>
                                            <ShowSubjects subjects={file.subjects}/>
                                        </div>
                                    </Col>
                            ))}
                        </Row>
                    </div>
            )
        }

        return (
                <div className="content-section">
                    <Title level={3}>Kuvastot</Title>
                    <Row gutter={[16, 16]} className="card-grid">
                        {galleries.map((gallery: WebSiteGallery) => (
                                <Col key={gallery.id} xs={24} sm={12} lg={8} xl={6} className="card-column">
                                    <div className="card">
                                        <Title level={4}>{gallery.shortname || `Gallery #${gallery.galleryId}`}</Title>
                                        <Paragraph>{gallery.description || 'No description available'}</Paragraph>
                                        <ShowSubjects subjects={gallery.subjects}/>
                                    </div>
                                    <GalleryLoader galleryId={gallery.galleryId}/>
                                </Col>
                        ))}
                    </Row>
                </div>
        )
    }

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
                            onPagePathSelect={loadPageContent}
                    />
                    <Content className="app-content">
                        {error && <Paragraph type="danger">{error}</Paragraph>}
                        {renderContent()}
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
                            defaultActiveKey="free"
                            items={[
                                {
                                    key: 'subjects',
                                    label: 'Tunnisteet',
                                    children: (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                                                <Space
                                                        orientation={"horizontal"}
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
                                    )
                                }
                            ]}
                    />
                </Modal>
            </Layout>
        </ConfigProvider>
    )
}

export default App
