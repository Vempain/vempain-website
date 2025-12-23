import {useCallback, useEffect, useRef, useState} from 'react';
import {
    Button,
    Col,
    Divider,
    Empty,
    Form,
    Input,
    Layout,
    Menu,
    type MenuProps,
    message,
    Modal,
    Pagination,
    Row,
    Select,
    Tabs,
    Tooltip,
    Tree,
    Typography
} from 'antd';
import type {DataNode} from 'antd/es/tree';
import {MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined} from '@ant-design/icons';
import './App.css';
import {useAuth} from './context/AuthContextInstance';
import {BottomFooter, GalleryEmbed, ShowSubjects} from './components';
import type {
    DirectoryNode,
    SubjectSearchResponse,
    WebSiteFile,
    WebSiteGallery,
    WebSitePage,
    WebSitePageContent,
    WebSitePageDirectory,
    WebSiteSubject
} from "./models";
import {galleryAPI, pageAPI, subjectSearchAPI, webSiteConfigurationAPI} from "./services";
import {toPathSegment, trimSlashes} from "./tools";

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
    const [collapsed, setCollapsed] = useState(false)
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
    const [freeTextQuery, setFreeTextQuery] = useState('')
    const [freeTextResult, setFreeTextResult] = useState<WebSitePage[]>([])
    const [freeTextLoading, setFreeTextLoading] = useState(false)
    const [subjectOptions, setSubjectOptions] = useState<WebSiteSubject[]>([])
    const [selectedSubjects, setSelectedSubjects] = useState<number[]>([])
    const [subjectSearchResult, setSubjectSearchResult] = useState<SubjectSearchResponse | null>(null)
    const [subjectSearchLoading, setSubjectSearchLoading] = useState(false)
    const [searchActiveGalleryId, setSearchActiveGalleryId] = useState<number | null>(null)
    const [subjectPaging, setSubjectPaging] = useState({pages: 0, galleries: 0, files: 0})
    const [subjectFilesPage, setSubjectFilesPage] = useState<SubjectSearchResponse['files'] | null>(null)
    const hasInitialized = useRef(false)

    const menuBarItems: MenuItem[] = [
        ...directories.map((dir) => ({
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

    async function loadDirectories() {
        const response = await pageAPI.getPublicPageDirectories()
        if (response.data) {
            setDirectories(response.data)
        }
    }

    async function loadTree(directory: string) {
        const response = await pageAPI.getDirectoryTree(directory)
        if (response.data) {
            setTreeData(buildTreeNodes(response.data, directory))
        } else {
            setTreeData([])
        }
    }

    const loadPageContent = useCallback(async (path: string) => {
        const response = await pageAPI.getPageContent(path)
        if (response.data) {
            setPageContent(response.data)
        }
    }, [])

    async function handleDirectoryClick(directory: string) {
        setSelectedDirectory(directory)
        setActiveSection('pages')
        setLoading(true)
        setError('')
        try {
            const response = await pageAPI.getPublicPages({directory, page: 0})
            if (response.data) {
                setPages(response.data.content)
                setPagination({
                    page: response.data.page,
                    size: response.data.size,
                    total_elements: response.data.total_elements,
                })
                setPageContent(null)
                await loadTree(directory)
                const indexPage = response.data.content.find((page: WebSitePage) => page.path === `${directory}/index`)
                if (indexPage) {
                    await loadPageContent(indexPage.path)
                }
            } else {
                setError(response.error || 'Failed to load pages')
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

    function handleGlobalSearch(value: string) {
        setSearchInput(value)
        setSearch(value)
        handleLoadSection('pages', {page: 1, search: value, directory: selectedDirectory})
    }

    function handleSearchSubmit() {
        if (!searchInput.trim()) {
            return
        }

        handleGlobalSearch(searchInput)
    }

    const handleFreeTextSearch = useCallback(async () => {
        if (!freeTextQuery.trim()) {
            return;
        }
        setFreeTextLoading(true)
        try {
            const resp = await pageAPI.getPublicPages({search: freeTextQuery, page: 0, size: 12})
            if (resp.data) {
                setFreeTextResult(resp.data.content)
                setActiveSection('search')
                setSubjectSearchResult(null)
                setSearchActiveGalleryId(null)
            } else {
                message.error(resp.error || 'Search failed')
            }
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Search failed')
        } finally {
            setFreeTextLoading(false)
        }
    }, [freeTextQuery])

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
        if (selectedSubjects.length === 0) {
            return;
        }
        setSubjectSearchLoading(true)
        try {
            const resp = await subjectSearchAPI.searchByIds({subjectIds: selectedSubjects, page: 0, size: 20})
            if (resp.data) {
                setSubjectSearchResult(resp.data)
                setSubjectFilesPage(resp.data.files)
                setSubjectPaging({
                    pages: resp.data.pages.page ?? 0,
                    galleries: resp.data.galleries.page ?? 0,
                    files: resp.data.files.page ?? 0,
                })
                setActiveSection('search')
                setSearchActiveGalleryId(null)
            } else {
                message.error(resp.error || 'Subject search failed')
            }
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Subject search failed')
        } finally {
            setSubjectSearchLoading(false)
        }
    }, [selectedSubjects])

    const handleSubjectPageChange = useCallback(async (pageNumber: number) => {
        if (selectedSubjects.length === 0) {
            return;
        }
        setSubjectSearchLoading(true)
        try {
            const resp = await subjectSearchAPI.searchByIds({
                subjectIds: selectedSubjects,
                page: Math.max(0, pageNumber - 1),
                size: subjectSearchResult?.pages.size ?? 12
            })
            if (resp.data) {
                setSubjectSearchResult(resp.data)
                setSubjectFilesPage(resp.data.files)
                setSubjectPaging({
                    pages: resp.data.pages.page ?? 0,
                    galleries: resp.data.galleries.page ?? 0,
                    files: resp.data.files.page ?? 0,
                })
            } else {
                message.error(resp.error || 'Subject search failed')
            }
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Subject search failed')
        } finally {
            setSubjectSearchLoading(false)
        }
    }, [selectedSubjects, subjectSearchResult])

    useEffect(() => {
        if (hasInitialized.current) {
            return
        }
        hasInitialized.current = true
        handleLoadSection('pages')
        loadDirectories()
        // Load main view with index page content when app starts
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

    function renderPageBody(body: string, embeds: WebSitePageContent['embeds']) {
        if (!body) return null

        // If no explicit embeds provided, try to detect placeholders directly in body
        let resolvedEmbeds = embeds
        if ((!resolvedEmbeds || resolvedEmbeds.length === 0) && body) {
            const placeholderPattern = /<!--\s*vps:embed:(?<type>[a-z0-9_-]+):(?<payload>[^\s>]+)\s*-->/ig
            const matches: Array<{ type: string; galleryId?: number; placeholder: string }> = []
            let m: RegExpExecArray | null
            while ((m = placeholderPattern.exec(body)) !== null) {
                const type = (m.groups?.type ?? '').toLowerCase()
                const payload = m.groups?.payload ?? ''
                if (type === 'gallery' && /^\d+$/.test(payload)) {
                    matches.push({type: 'gallery', galleryId: Number(payload), placeholder: m[0]})
                }
            }
            if (matches.length > 0) {
                resolvedEmbeds = matches.map((x) => ({type: x.type, galleryId: x.galleryId as number, placeholder: x.placeholder}))
            }
        }

        if (!resolvedEmbeds || resolvedEmbeds.length === 0) {
            return <div dangerouslySetInnerHTML={{__html: body}}/>
        }

        const segments: React.ReactNode[] = []
        let cursor = 0

        resolvedEmbeds.forEach((embed, index) => {
            const placeholder = embed.placeholder ?? `<!--vps:embed:${embed.type}:${embed.galleryId}-->`
            const placeholderIndex = body.indexOf(placeholder, cursor)

            if (placeholderIndex === -1) {
                return
            }

            const beforeHtml = body.slice(cursor, placeholderIndex)
            if (beforeHtml.trim()) {
                segments.push(
                        <div key={`html-${index}`} dangerouslySetInnerHTML={{__html: beforeHtml}}/>
                )
            }

            if (embed.type === 'gallery' && embed.galleryId) {
                segments.push(
                        <GalleryEmbed key={`gallery-${embed.galleryId}-${index}`} galleryId={embed.galleryId}/>
                );
            }

            cursor = placeholderIndex + placeholder.length;
        });

        const tail = body.slice(cursor);
        if (tail.trim()) {
            segments.push(<div key="html-tail" dangerouslySetInnerHTML={{__html: tail}}/>);
        }

        return <>{segments}</>;
    }

    function renderPageDetail() {
        if (!pageContent) {
            return null
        }

        return (
                <div className="content-section page-detail">
                    <Title level={2}>{pageContent.title}</Title>
                    {pageContent.published && (
                            <Paragraph type="secondary">
                                Julkaistu {new Date(pageContent.published).toLocaleString()} - {pageContent.creator}
                            </Paragraph>
                    )}
                    <ShowSubjects subjects={pageContent.subjects} max={10}/>
                    {renderPageBody(pageContent.body, pageContent.embeds)}
                </div>
        )
    }

    function renderSearchResults() {
        if (!freeTextResult.length && !subjectSearchResult) {
            return <Empty description="No search results"/>;
        }

        const pagesToShow = subjectSearchResult ? subjectSearchResult.pages.content : freeTextResult;
        const galleriesToShow = subjectSearchResult ? subjectSearchResult.galleries.content : [];

        const sections: Array<{
            key: 'pages' | 'galleries' | 'files';
            title: string;
            items: unknown[];
            render: () => React.ReactNode;
        }> = [];

        if (galleriesToShow.length > 0) {
            sections.push({
                key: 'galleries',
                title: 'Galleries',
                items: galleriesToShow,
                render: () => (
                        <>
                            <Row gutter={[16, 16]}>
                                {galleriesToShow.map((gallery) => (
                                        <Col key={`search-gallery-${gallery.id}`} span={24}>
                                            <a href="#" onClick={(e) => {
                                                e.preventDefault();
                                                setSearchActiveGalleryId(gallery.galleryId);
                                            }}>
                                                <Title level={4} style={{marginBottom: 4}}>{gallery.shortname || `Gallery #${gallery.galleryId}`}</Title>
                                                <Paragraph>{gallery.description}</Paragraph>
                                                <ShowSubjects subjects={gallery.subjects ?? []} max={8}/>
                                            </a>
                                        </Col>
                                ))}
                            </Row>
                            {subjectSearchResult && (
                                    <Pagination
                                            style={{marginTop: 12}}
                                            current={(subjectPaging.galleries ?? 0) + 1}
                                            pageSize={subjectSearchResult.galleries.size}
                                            total={subjectSearchResult.galleries.total_elements}
                                            showSizeChanger={false}
                                            onChange={(pageNumber) => handleSubjectPageChange(pageNumber)}
                                    />
                            )}
                            {searchActiveGalleryId && (
                                    <div style={{marginTop: 12}}>
                                        <GalleryEmbed galleryId={searchActiveGalleryId}/>
                                    </div>
                            )}
                        </>
                ),
            });
        }

        if (subjectSearchResult && subjectFilesPage) {
            sections.push({
                key: 'files',
                title: 'Files',
                items: subjectFilesPage.content,
                render: () => (
                        <GalleryEmbed
                                initialPage={{...subjectFilesPage, gallerySubjects: []}}
                                fetchPageFn={async (page, size) => {
                                    const resp = await subjectSearchAPI.searchByIds({subjectIds: selectedSubjects, page, size});
                                    if (resp.data) {
                                        setSubjectSearchResult(resp.data);
                                        setSubjectPaging({
                                            pages: resp.data.pages.page ?? 0,
                                            galleries: resp.data.galleries.page ?? 0,
                                            files: resp.data.files.page ?? 0,
                                        });
                                        setSubjectFilesPage(resp.data.files);
                                        return {...resp.data.files, gallerySubjects: []};
                                    }
                                    return null;
                                }}
                        />
                ),
            });
        }

        if (pagesToShow.length > 0) {
            sections.push({
                key: 'pages',
                title: 'Pages',
                items: pagesToShow,
                render: () => (
                        <>
                            <Row gutter={[16, 16]}>
                                {pagesToShow.map((page) => (
                                        <Col key={`search-page-${page.id}`} span={24}>
                                            <a href="#" onClick={(e) => {
                                                e.preventDefault();
                                                setPageContent(null);
                                                setActiveSection('pages');
                                                void loadPageContent(page.path);
                                            }}>
                                                <Title level={4} style={{marginBottom: 4}}>{page.title}</Title>
                                                <Paragraph type="secondary">{page.path}</Paragraph>
                                                <ShowSubjects subjects={page.subjects ?? []} max={6}/>
                                            </a>
                                        </Col>
                                ))}
                            </Row>
                            {subjectSearchResult && (
                                    <Pagination
                                            style={{marginTop: 12}}
                                            current={(subjectPaging.pages ?? 0) + 1}
                                            pageSize={subjectSearchResult.pages.size}
                                            total={subjectSearchResult.pages.total_elements}
                                            showSizeChanger={false}
                                            onChange={(pageNumber) => handleSubjectPageChange(pageNumber)}
                                    />
                            )}
                        </>
                ),
            });
        }

        // Order sections by descending item count
        sections.sort((a, b) => b.items.length - a.items.length);

        return (
                <div className="content-section">
                    <Title level={3}>Search results</Title>
                    {sections.map((section) => (
                            <div key={`search-section-${section.key}`} style={{marginTop: 12}}>
                                <Divider orientation="horizontal">{section.title}</Divider>
                                {section.render()}
                            </div>
                    ))}
                </div>
        );
    }

    function renderContent() {
        if (activeSection === 'search') {
            return renderSearchResults();
        }

        if (activeSection === 'pages') {
            if (pageContent) {
                return renderPageDetail()
            }

            return (
                    <div className="content-section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Title level={3}>Sivut</Title>
                            <Input.Search
                                    placeholder="Search pages"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onSearch={handleSearchSubmit}
                                    style={{maxWidth: 300}}
                            />
                        </div>
                        <Paragraph>Viimeisimmät sivut</Paragraph>
                        <Row gutter={[16, 16]} className="card-grid">
                            {pages.map((page) => (
                                    <Col key={page.id} xs={24} sm={12} lg={8} xl={6} className="card-column">
                                        <div className="card">
                                            <Title level={4}>{page.title}</Title>
                                            <Paragraph type="secondary">{page.path}</Paragraph>
                                            <Paragraph ellipsis={{rows: 3}}>{page.header}</Paragraph>
                                            {page.subjects && <ShowSubjects subjects={page.subjects} max={5}/>}
                                            {page.aclId && <Paragraph type="warning">Pääsy rajoitettu</Paragraph>}
                                        </div>
                                    </Col>
                            ))}
                        </Row>
                        <Pagination
                                current={pagination.page + 1}
                                pageSize={pagination.size}
                                total={pagination.total_elements}
                                onChange={(pageNumber) => handleLoadSection('pages', {page: pageNumber - 1})}
                                pageSizeOptions={[10, 20, 30, 40, 50]}
                                showSizeChanger={false}
                        />
                    </div>
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
                                            <Title level={4}>{file.path}</Title>
                                            <Paragraph type="secondary">{file.mimetype}</Paragraph>
                                            <Paragraph>{file.aclId ?? 'Julkinen'}</Paragraph>
                                            <ShowSubjects subjects={file.subjects} max={4}/>
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
                        {galleries.map((gallery) => (
                                <Col key={gallery.id} xs={24} sm={12} lg={8} xl={6} className="card-column">
                                    <div className="card">
                                        <Title level={4}>{gallery.shortname || `Gallery #${gallery.galleryId}`}</Title>
                                        <Paragraph>{gallery.description || 'No description available'}</Paragraph>
                                        <ShowSubjects subjects={gallery.subjects} max={6}/>
                                    </div>
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
                    <Sider trigger={null}
                           collapsible
                           collapsed={collapsed}
                           className="app-sider"
                    >
                        <Button
                                type="text"
                                icon={collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                                onClick={() => setCollapsed(!collapsed)}
                        />
                        <Tooltip title={siteConfig.description}>
                            <div className="logo">{siteConfig.name}</div>
                        </Tooltip>
                        {selectedDirectory && (
                                <Tree
                                        showLine={false}
                                        treeData={treeData}
                                        defaultExpandAll
                                        onSelect={handleTreeSelect}
                                />
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
                        title="Search"
                        open={searchModalVisible}
                        onCancel={() => setSearchModalVisible(false)}
                        footer={null}
                        width={720}
                >
                    <Tabs
                            defaultActiveKey="free"
                            items={[
                                {
                                    key: 'free',
                                    label: 'Free text',
                                    children: (
                                            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                                                <Input
                                                        placeholder="Search pages"
                                                        value={freeTextQuery}
                                                        onChange={(e) => setFreeTextQuery(e.target.value)}
                                                        onPressEnter={handleFreeTextSearch}
                                                />
                                                <Button type="primary" loading={freeTextLoading} onClick={handleFreeTextSearch}>Search</Button>
                                            </div>
                                    )
                                },
                                {
                                    key: 'subjects',
                                    label: 'Subjects',
                                    children: (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                                                <Select
                                                        mode="multiple"
                                                        placeholder="Type at least 3 letters"
                                                        showSearch={{onSearch: handleSubjectAutocomplete, filterOption: false}}
                                                        value={selectedSubjects}
                                                        onChange={(vals) => setSelectedSubjects(vals as number[])}
                                                        options={subjectOptions.map((s) => ({label: s.subject, value: s.id}))}
                                                        style={{width: '100%'}}
                                                />
                                                <Button type="primary" loading={subjectSearchLoading} onClick={handleSubjectSearch}
                                                        disabled={selectedSubjects.length === 0}>
                                                    Search by subjects
                                                </Button>
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
