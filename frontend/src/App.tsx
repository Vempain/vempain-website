import {Button, Col, Form, Input, Layout, Menu, type MenuProps, message, Modal, Row, Select, Space, Tabs, Tooltip, Tree, Typography} from 'antd';
import type {DataNode} from 'antd/es/tree';
import {SearchOutlined} from '@ant-design/icons';
import './App.css';
import {useAuth} from './context/AuthContextInstance';
import {useTheme} from './context/ThemeContextInstance';
import {BottomFooter, GalleryLoader, PageView, ShowSubjects, SubjectSearchLoader} from './components';
import type {DirectoryNode, WebSiteFile, WebSiteGallery, WebSitePage, WebSitePageContent, WebSitePageDirectory, WebSiteSubject} from "./models";
import {galleryAPI, pageAPI, subjectSearchAPI, webSiteConfigurationAPI} from "./services";
import {toPathSegment, trimSlashes} from "./tools";
import {useCallback, useEffect, useRef, useState} from 'react';

const {Header, Sider, Content} = Layout
const {Title, Paragraph} = Typography

type MenuItem = Required<MenuProps>["items"][number];
type DirectoryTreeNode = DataNode & {
    fullPath: string
    isDirectory: boolean
    indexPagePath?: string
}

const buildTreeNodes = (nodes: DirectoryNode[], parentPath: string): DirectoryTreeNode[] =>
        nodes.map((node) => {
            const rawChildren = (node.children ?? []) as DirectoryNode[]
            const fullPath = node.key.includes('/') ? trimSlashes(node.key) : [trimSlashes(parentPath), toPathSegment(node)].filter(Boolean).join('/')
            const childNodes = rawChildren.length > 0 ? buildTreeNodes(rawChildren, fullPath) : []
            const indexChild = childNodes.find((child) => child.fullPath.endsWith('/index'))
            const filteredChildren = childNodes.filter((child) => !child.fullPath.endsWith('/index'))

            return {
                ...node,
                key: fullPath,
                children: filteredChildren.length ? filteredChildren : undefined,
                fullPath,
                isDirectory: rawChildren.length > 0,
                indexPagePath: indexChild?.fullPath,
                selectable: rawChildren.length > 0 ? Boolean(indexChild) : true,
            }
        })

const DEFAULT_PAGE_PATH = 'index'
const DEFAULT_SITE_CONFIG = {name: 'Vempain', description: 'Vempain'}

function App() {
    const {isAuthenticated, login, logout, showLogin, hideLogin, loginVisible} = useAuth()
    const {applyPageStyle, resetToDefault} = useTheme()
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
    const [treeData, setTreeData] = useState<DirectoryTreeNode[]>([])
    const [pageContent, setPageContent] = useState<WebSitePageContent | null>(null)
    const [siteConfig, setSiteConfig] = useState(DEFAULT_SITE_CONFIG)
    const [searchModalVisible, setSearchModalVisible] = useState(false)
    const [subjectOptions, setSubjectOptions] = useState<WebSiteSubject[]>([])
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([])
    const [pageError, setPageError] = useState<string | null>(null)
    const [pageStatus, setPageStatus] = useState<number | null>(null)
    const hasInitialized = useRef(false)

    const menuBarItems: MenuItem[] = [
        ...directories.map((dir: WebSitePageDirectory) => ({
            key: `dir-${dir.name}`,
            label: <a href="#" onClick={(e) => {
                e.preventDefault();
                handleDirectoryClick(dir.name);
            }}>{dir.name}</a>,
        })),
        {type: 'divider'},
        {
            key: 'auth',
            label: isAuthenticated ? (
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        logout();
                    }}>Logout</a>
            ) : (
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        showLogin();
                    }}>Login</a>
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
                                e.preventDefault()
                                setSearchModalVisible(true)
                            }}
                    />
            ),
        }
    ]

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
    const findIndexPathInTree = useCallback((path: string): string | null => {
        console.log('Finding index path in tree for:', path)
        const normalized = trimSlashes(path)
        const segments = normalized.split('/')
        // Walk the tree to locate the node matching the path prefix, then see if index child exists
        let level: DirectoryTreeNode[] = treeData
        let foundNode: DirectoryTreeNode | null = null

        for (const seg of segments) {
            const next = level.find((n) => trimSlashes(n.fullPath).endsWith(seg))
            if (!next) return null
            foundNode = next
            level = (next.children as DirectoryTreeNode[]) ?? []
        }
        return foundNode?.indexPagePath ?? null
    }, [treeData])

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

    const ensureIndexPageLoadedForPath = useCallback(async (path: string) => {
        const indexPathFromTree = findIndexPathInTree(path)
        const normalized = trimSlashes(path)
        const targetPath = indexPathFromTree
                ? indexPathFromTree
                : normalized === 'index' || normalized.endsWith('/index')
                        ? normalized
                        : `${normalized}/index`
        await loadPageContent(targetPath)
    }, [findIndexPathInTree, loadPageContent])

    async function handleDirectoryClick(directory: string) {
        setSelectedDirectory(directory)
        setActiveSection('pages')
        setLoading(true)
        setError('')
        try {
            const [pagesResp, treeResp] = await Promise.all([
                pageAPI.getPublicPages({directory, page: 0}),
                pageAPI.getDirectoryTree(directory),
            ])

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

            if (treeResp.data) {
                console.log("Looking for tree nodes in directory:", directory, treeResp.data)
                setTreeData(buildTreeNodes(treeResp.data, directory))
                await ensureIndexPageLoadedForPath(directory)
            } else {
                console.log("No tree data received for directory:", directory)
                setTreeData([])
                setPageContent(null)
            }
        } catch (err) {
            const messageText = err instanceof Error ? err.message : 'Failed to load data'
            setError(messageText)
            message.error(messageText)
        } finally {
            setLoading(false)
        }
    }

    async function handleTreeSelect(keys: React.Key[], info: { node: DirectoryTreeNode }) {
        if (keys.length === 0) {
            return
        }

        const targetPath = info.node.isDirectory ? info.node.indexPagePath : info.node.fullPath
        if (!targetPath) {
            return
        }

        await loadPageContent(targetPath)
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
        void ensureIndexPageLoadedForPath(DEFAULT_PAGE_PATH)
    }, [handleLoadSection, loadDirectories, ensureIndexPageLoadedForPath])

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
        if (!pageContent || pageContent.style === null || pageContent.style === undefined) {
            resetToDefault()
        } else {
            applyPageStyle(pageContent.style)
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
            <Layout className="app-layout">
                <Header className="app-header"
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 0px",
                            backgroundColor: "#191919",
                            maxWidth: "100%"
                        }}
                >
                    <Menu
                            mode="horizontal"
                            selectedKeys={selectedDirectory ? [`dir-${selectedDirectory}`] : []}
                            items={menuBarItems}
                            style={{width: "100%"}}
                    />
                </Header>
                <div className="app-main">
                    <Sider
                            trigger={null}
                            collapsible
                            collapsed={false}
                            width="auto"
                            style={{flex: '0 0 auto', minWidth: 320, maxWidth: 720}}
                            className="app-sider"
                    >
                        <Tooltip title={siteConfig.description}>
                            <div className="logo">{siteConfig.name}</div>
                        </Tooltip>
                        {selectedDirectory && (
                                <div style={{overflowX: 'auto'}}>
                                    <Tree
                                            showLine={false}
                                            treeData={treeData}
                                            defaultExpandAll
                                            onSelect={handleTreeSelect}
                                            // ensure tree rows don't wrap and can scroll horizontally if needed
                                            style={{whiteSpace: 'nowrap'}}
                                    />
                                </div>
                        )}
                    </Sider>
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
    )
}

export default App
