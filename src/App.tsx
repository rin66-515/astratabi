import { useEffect, useMemo, useState, type FormEvent } from 'react'
import logo from './assets/astratabi-logo-main.png'
import {
  createDelivery,
  extendDelivery,
  getAdminDeliveries,
  getAdminEvents,
  getAdminSession,
  getAdminSummary,
  getDeliveryByToken,
  issueDelivery,
  login,
  logout,
  requestDownloadTicket,
  revokeDelivery,
  type AdminDelivery,
  type ApiError,
  type DeliveryEvent,
  type DeliveryLookup,
  type DeliveryStatus,
  type DeliverySummaryCounts,
} from './api/client'

const diary = [
  { date: '2026.07.26', text: '遠回りの夜にも、次の一歩を照らす月がある。', tag: '日々' },
  { date: '2026.07.25', text: '言葉をひとつ覚えるたび、知らない街が少し近くなる。', tag: '日本語' },
  { date: '2026.07.24', text: '設計は、まだ見えない旅を誰かと共有するための地図。', tag: 'ものづくり' },
]

const japanesePosts = [
  { word: '一期一会', reading: 'いちごいちえ', meaning: '一生に一度の出会いとして大切にすること。', type: '今日のことば' },
  { word: '切り分け', reading: 'きりわけ', meaning: '障害の原因範囲を段階的に特定すること。', type: 'IT 日本語' },
  { word: 'お疲れさまです', reading: 'おつかれさまです', meaning: '仕事の場で交わす、相手へのねぎらいの言葉。', type: '交流ノート' },
]

const navItems = [
  ['story', '物語'], ['diary', '一句日記'], ['japanese', 'IT 日本語'], ['resources', '資料・交付'], ['support', 'お客様サポート'],
] as const

type PublicPage = 'home' | (typeof navItems)[number][0]
type Page = PublicPage | 'delivery' | 'admin'
type Route = { page: Page, token?: string }

const pageMeta: Record<Page, { number: string, label: string }> = {
  home: { number: '00', label: 'AstraTabi' },
  story: { number: '01', label: '物語' },
  diary: { number: '02', label: '一句日記' },
  japanese: { number: '03', label: 'IT 日本語' },
  resources: { number: '04', label: '資料・交付' },
  support: { number: '05', label: 'お客様サポート' },
  delivery: { number: 'DL', label: '専用受取' },
  admin: { number: 'AD', label: '配布管理' },
}

function routeFromHash(): Route {
  const [routeName, query = ''] = window.location.hash.replace(/^#/, '').split('?')
  const publicPages = ['home', ...navItems.map(([id]) => id)] as string[]
  if (routeName === 'delivery') return { page: 'delivery', token: new URLSearchParams(query).get('token') ?? undefined }
  if (routeName === 'admin' || routeName === 'admin-preview') return { page: 'admin' }
  return { page: publicPages.includes(routeName) ? routeName as PublicPage : 'home' }
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [route, setRoute] = useState<Route>(routeFromHash)
  const activePage = pageMeta[route.page]

  useEffect(() => {
    const syncRoute = () => {
      setRoute(routeFromHash())
      setMenuOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  return (
    <main>
      <aside className="wide-rail" aria-hidden="true"><span>{activePage.number}</span><i /><small>{activePage.label}</small></aside>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="AstraTabi ホーム"><img src={logo} alt="" /><span>AstraTabi</span></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}><span /><span /><span /></button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="メインナビゲーション">
          {navItems.map(([id, label]) => <a className={route.page === id ? 'active' : ''} href={`#${id}`} key={id}>{label}</a>)}
        </nav>
      </header>

      {route.page === 'home' && <Home />}
      {route.page === 'story' && <Story />}
      {route.page === 'diary' && <Diary />}
      {route.page === 'japanese' && <Japanese />}
      {route.page === 'resources' && <Resources />}
      {route.page === 'support' && <Support />}
      {route.page === 'delivery' && <Delivery initialToken={route.token} />}
      {route.page === 'admin' && <AdminConsole />}

      <footer><a className="brand" href="#home"><img src={logo} alt="" /><span>AstraTabi</span></a><p>雲と月をたずさえて、遠くへ。</p><small>© 2026 AstraTabi. Built slowly, with intention.</small></footer>
    </main>
  )
}

function Home() { return <>
  <section className="portrait-hero" aria-labelledby="hero-title">
    <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><span className="floating-star f-one">✦</span><span className="floating-star f-two">·</span>
    <div className="portrait-intro"><p className="eyebrow">AstraTabi / 雲と月をたずさえて、遠くへ。</p><p className="home-label">Learning by doing. Still becoming.</p><h1 id="hero-title">遠回りを、<br /><i>自分だけの軌跡に。</i></h1><p className="hero-copy">フロントエンドを独学で仕事にし、日本語を独学で<br />JLPT N1 180/180 へ。学び続けた日々を、作品と言葉に変えていく。</p><div className="hero-actions"><a className="button primary" href="#story">私の旅路を読む</a><a className="button quiet" href="#support">お客様サポート</a></div></div>
    <aside className="identity-card"><span className="card-dot" /><p>THE QUIET BUILDER</p><strong>Learn deeply.<br />Build gently.<br />Go far.</strong><small>Frontend / Japanese / Records</small></aside>
  </section>
  <section className="home-proof"><p className="eyebrow">Made from persistence</p><div className="proof-grid"><article><span>01</span><h2>独学で、<br />仕事へ。</h2><p>わからないことを、調べる。つくる。直す。小さな繰り返しを、前へ進む力に変えてきました。</p></article><article className="score-card"><span>02</span><p className="score-caption">Japanese self-study</p><strong>180<span>/180</span></strong><p>JLPT N1<br />満点</p></article><article><span>03</span><h2>記録して、<br />育てていく。</h2><p>一句の日記、技術の学び、遠回りの試行錯誤。昨日の自分を超えるための、静かなアーカイブです。</p></article></div></section>
  <section className="home-lab"><div><p className="eyebrow">The way I make</p><h2>コードも言葉も、<br />相手に届くところまで。</h2><p>速さだけを追わず、意図を理解して、きちんと形にする。学びの中にも、次の誰かの地図になればいいと思っています。</p><a className="text-link" href="#resources">資料・交付について <span>→</span></a></div><div className="code-window" aria-label="フロントエンド制作のイメージ"><div><i /><i /><i /><span>journey.ts</span></div><pre><code><b>const</b> journey = &#123;{`\n`}  learn: <em>'every day'</em>,{`\n`}  build: <em>'with intention'</em>,{`\n`}  direction: <em>'astra'</em>{`\n`}&#125;{`\n\n`}journey.<b>keepGoing</b><span className="cursor">_</span></code></pre></div></section>
</> }

function Story() { return <section className="section story"><div className="section-heading"><p className="eyebrow">01 / Story</p><h2>八千里路、雲と月</h2></div><div className="story-grid"><p className="lead">「遠い場所」は、地図の端ではなく、まだ名前のない自分の中にある。</p><div><p>雲のように移ろいながら、月のように静かに進む。学び、つくり、誰かと話す日々を、旅の断片として残していきます。</p><a className="text-link" href="#diary">日々の記録へ <span>→</span></a></div></div><ol className="timeline"><li><span>START</span>独学から、できることを一つずつ増やす</li><li><span>NOW</span>個人 IP と創作の拠点を育てる</li><li><span>FAR</span>旅の途中で出会う景色を、次の物語にする</li></ol></section> }

function Diary() { return <section className="section soft-section"><div className="section-heading"><p className="eyebrow">02 / One line a day</p><h2>一句日記</h2><p>短い言葉で、今日を置いていく。</p></div><div className="diary-list">{diary.map((entry) => <article className="diary-card" key={entry.date}><div><span>{entry.date}</span><em>{entry.tag}</em></div><p>{entry.text}</p></article>)}</div><button className="text-button" type="button">日記アーカイブは準備中です　→</button></section> }

function Japanese() { return <section className="section japanese-section"><div className="section-heading"><p className="eyebrow">03 / IT Japanese corner</p><h2>IT 日本語・交流角</h2><p>独学で N1 にたどり着いたからこそ、言葉で迷う時間にも伴走したい。</p></div><div className="japanese-grid">{japanesePosts.map((post) => <article className="word-card" key={post.word}><span>{post.type}</span><h3>{post.word}</h3><p className="reading">{post.reading}</p><p>{post.meaning}</p></article>)}</div><div className="notice"><strong>投稿は準備中です。</strong><span>公開前に内容を確認する、安心できる交流の場として設計しています。</span></div></section> }

function Resources() { return <section className="section resources-section"><div className="section-heading"><p className="eyebrow">04 / Resources & delivery</p><h2>資料・交付について</h2><p>制作資料は、ご依頼内容を確認したうえで個別にご案内します。公開ページから直接ファイルを配布することはありません。</p></div><div className="resources-grid"><article className="package-card"><p className="status">DOCUMENT PACKAGE</p><h3>実務設計書パッケージ</h3><p>要件定義から基本設計・詳細設計・テスト資料まで、案件単位で整理したドキュメント一式です。</p><span>内容・価格は準備中</span></article><article className="package-card"><p className="status">CUSTOM DELIVERY</p><h3>顧客別の安全な交付</h3><p>お支払い確認後、配布先を記録した専用リンクをご案内します。期限とダウンロード回数を個別に管理します。</p><span>専用リンクで受け取り</span></article></div><ol className="fulfillment-flow"><li><span>01</span><div><strong>ご相談・ご依頼</strong><p>お客様サポートへ、ご希望の資料や用途をお知らせください。</p></div></li><li><span>02</span><div><strong>お支払い確認</strong><p>内容を確認後に、ご案内した方法でお手続きいただきます。</p></div></li><li><span>03</span><div><strong>専用リンクを発行</strong><p>確認完了後、お客様だけが使える受取リンクをお送りします。</p></div></li></ol><div className="delivery-cta"><div><p className="status">CLIENT-ONLY LINK</p><h3>専用受取ページは、交付後に直接ご案内します。</h3><p>リンクをお持ちの方は、その URL を開くだけで受取内容を確認できます。</p></div><a className="button outline" href="#delivery">受取ページを開く</a></div></section> }

function Support() { return <section className="section support-section"><div className="section-heading"><p className="eyebrow">Customer support</p><h2>お客様サポート</h2><p>ご相談・ご依頼・交付物については、WeChat のお客様サポートまでご連絡ください。</p></div><div className="support-panel"><div className="qr-placeholder" aria-label="WeChat QR コードの掲載予定"><span>WECHAT</span><b>+</b><i>QR</i></div><div><p className="status">WECHAT SUPPORT</p><h3>お客様サポート</h3><p>ご依頼の背景や、ご希望の内容をお知らせください。内容を確認後、対応方法をご案内します。</p><dl className="support-details"><div><dt>WeChat ID</dt><dd>公開準備中</dd></div><div><dt>対応内容</dt><dd>ご相談・ご依頼・交付物のお問い合わせ</dd></div><div><dt>ご案内</dt><dd>お支払い確認後、専用の交付リンクを発行します</dd></div></dl><p className="small-note">WeChat ID または QR コードを確定後、ここに掲載します。</p></div></div></section> }

function Delivery({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken ?? '')
  const [lookup, setLookup] = useState<DeliveryLookup | null>(null)
  const [loading, setLoading] = useState(Boolean(initialToken))
  const [downloadNotice, setDownloadNotice] = useState('')

  useEffect(() => {
    setToken(initialToken ?? '')
    setDownloadNotice('')
    if (!initialToken) { setLookup(null); setLoading(false); return }
    setLoading(true)
    getDeliveryByToken(initialToken).then(setLookup).catch(() => setLookup({ status: 'not-found' })).finally(() => setLoading(false))
  }, [initialToken])

  function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedToken = token.trim()
    if (trimmedToken) window.location.hash = `delivery?token=${encodeURIComponent(trimmedToken)}`
  }

  async function startDownload() {
    if (!initialToken) return
    try {
      const ticket = await requestDownloadTicket(initialToken)
      setDownloadNotice(`ダウンロードを開始しました。残り ${ticket.remainingDownloads} 回です。`)
      window.location.assign(ticket.downloadUrl)
    } catch (error) {
      setDownloadNotice((error as ApiError).message)
    }
  }

  return <section className="section delivery-section"><div className="section-heading"><p className="eyebrow">Client delivery</p><h2>専用受取ページ</h2><p>このページは、交付時にご案内する専用リンクからのみご利用いただく想定です。</p></div><div className="delivery-gate"><form onSubmit={submitToken}><label htmlFor="delivery-token">受取トークン</label><div><input id="delivery-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="専用リンクのトークンを入力" /><button className="button outline" type="submit">受取内容を確認</button></div><small>専用リンクの URL から自動で受取情報を表示します。</small></form></div>{loading && <p className="delivery-state" aria-live="polite">受取情報を確認しています…</p>}{lookup?.status === 'not-found' && <p className="delivery-state error" role="alert">有効な受取情報を確認できませんでした。ご案内した専用リンクをご確認ください。</p>}{lookup && lookup.status !== 'not-found' && <article className="delivery-preview" aria-live="polite"><div className="preview-title"><span>専用受取情報</span><span>{lookup.status === 'active' ? '交付準備済み' : lookup.status === 'preparing' ? '交付準備中' : '有効期限終了'}</span></div><h3>{lookup.delivery.projectName}</h3><p className="watermark-note">配布先：{lookup.delivery.recipientLabel} ／ {lookup.delivery.message}</p><dl><div><dt>配布管理番号</dt><dd>{lookup.delivery.deliveryNumber}</dd></div><div><dt>有効期限</dt><dd>{lookup.delivery.expiresAt}</dd></div><div><dt>残りダウンロード回数</dt><dd>{lookup.delivery.remainingDownloads} 回</dd></div></dl><p className="file-list"><span>▣ {lookup.delivery.packageName}</span></p>{lookup.status === 'active' && <button className="button primary" onClick={startDownload}>ZIP をダウンロード</button>}{downloadNotice && <p className="download-notice" role="status">{downloadNotice}</p>}</article>}</section>
}

const statusLabels: Record<DeliveryStatus, string> = { DRAFT: '草稿', PREPARING: '准备中', ISSUED: '已发放', EXPIRED: '已过期', REVOKED: '已停用', CANCELLED: '已取消' }

function statusClass(status: DeliveryStatus) {
  return status === 'ISSUED' ? 'issued' : status === 'REVOKED' || status === 'CANCELLED' ? 'stopped' : 'pending'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

function AdminConsole() {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    getAdminSession().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false)).finally(() => setChecking(false))
  }, [])

  if (checking) return <section className="section admin-preview-section"><p className="delivery-state">管理者セッションを確認しています…</p></section>
  if (!authenticated) return <AdminLogin onLoggedIn={() => setAuthenticated(true)} />
  return <AdminWorkspace onLoggedOut={() => setAuthenticated(false)} />
}

function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [loginId, setLoginId] = useState('admin-001')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setNotice('')
    try {
      await login(loginId.trim(), password)
      onLoggedIn()
    } catch (error) {
      setNotice((error as ApiError).message)
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="section admin-preview-section"><div className="section-heading"><p className="eyebrow">管理者専用</p><h2>交付管理台</h2><p>交付の作成・リンク発行・停止は、単一の管理者会話でのみ実行できます。</p></div><section className="admin-panel admin-issue-panel"><div className="admin-panel-heading"><div><p className="status">ADMIN SIGN IN</p><h3>ログイン</h3></div></div><form className="admin-form" onSubmit={submit}><div className="admin-form-grid"><label className="admin-field">ログインID<input autoComplete="username" value={loginId} onChange={(event) => setLoginId(event.target.value)} /></label><label className="admin-field">パスワード<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label></div><div className="admin-form-actions"><p>管理操作はサーバー側の会話確認、CSRF 保護、監査ログ記録を通して処理します。</p><button className="button primary" disabled={submitting} type="submit">{submitting ? '確認中…' : 'ログイン'}</button></div></form>{notice && <p className="admin-detail-notice" role="alert">{notice}</p>}</section></section>
}

function LiveDeliveryDetails({ record, events, notice, onAction }: { record: AdminDelivery; events: DeliveryEvent[]; notice: string; onAction: (action: 'extend' | 'reissue' | 'revoke') => void }) {
  return <><p className="status">交付详情</p><h3>{record.deliveryNo}</h3><dl><div><dt>客户</dt><dd>{record.customerCode} / {record.customerName}</dd></div><div><dt>案件</dt><dd>{record.projectName}</dd></div><div><dt>资料包</dt><dd>{record.packageName}</dd></div><div><dt>自动水印</dt><dd>{record.watermarkText}</dd></div><div><dt>下载次数</dt><dd>{record.downloadCount} / {record.downloadLimit}</dd></div></dl><div className="admin-detail-actions"><button onClick={() => onAction('extend')}>延长 30 日</button><button onClick={() => onAction('reissue')}>重新发放</button><button onClick={() => onAction('revoke')}>停止链接</button></div>{notice && <p className="admin-detail-notice" role="status">{notice}</p>}<small>{record.status === 'PREPARING' ? '资料包和水印生成模块尚未接入；现在的专属链接只显示“准备中”，不会消耗下载次数。' : '所有状态变更和下载事件均由服务端记录。'}</small>{events.length > 0 && <ol className="admin-event-list">{events.slice(0, 4).map((event) => <li key={`${event.occurredAt}-${event.eventType}`}><time>{formatDate(event.occurredAt)}</time><span>{event.eventType}</span></li>)}</ol>}</>
}

function AdminWorkspace({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [records, setRecords] = useState<AdminDelivery[]>([])
  const [summary, setSummary] = useState<DeliverySummaryCounts>({ total: 0, issued: 0, preparing: 0, revoked: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<DeliveryEvent[]>([])
  const [customerCode, setCustomerCode] = useState('C001')
  const [customerName, setCustomerName] = useState('')
  const [packageName, setPackageName] = useState('設計書パッケージ（ZIP）')
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [downloadLimit, setDownloadLimit] = useState('3')
  const [issuedLink, setIssuedLink] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [notice, setNotice] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const selected = records.find((record) => record.id === selectedId) ?? records[0]

  function refresh() {
    return Promise.all([getAdminDeliveries({ keyword: search, status: statusFilter || undefined, page, size: 8 }), getAdminSummary()])
      .then(([deliveryPage, counts]) => {
        setRecords(deliveryPage.content)
        setTotalPages(Math.max(1, deliveryPage.totalPages))
        setTotalElements(deliveryPage.totalElements)
        setSummary(counts)
        setSelectedId((current) => current && deliveryPage.content.some((record) => record.id === current) ? current : deliveryPage.content[0]?.id ?? null)
      })
      .catch((error: ApiError) => setNotice(error.message))
  }

  useEffect(() => { void refresh() }, [page, search, statusFilter])
  useEffect(() => { if (selectedId) getAdminEvents(selectedId).then(setEvents).catch(() => setEvents([])) }, [selectedId])

  async function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    try {
      const created = await createDelivery({ customerCode: customerCode.trim(), customerName: customerName.trim(), packageName, expiresAt: `${expiresAt}T23:59:59+09:00`, downloadLimit: Number(downloadLimit) })
      const issued = await issueDelivery(created.id)
      setIssuedLink(issued.deliveryLink)
      setNotice('已创建交付并生成专属链接。资料包生成完成前，客户页面会显示“准备中”。')
      await refresh()
      setSelectedId(created.id)
    } catch (error) {
      setNotice((error as ApiError).message)
    }
  }

  async function updateSelected(action: 'extend' | 'reissue' | 'revoke') {
    if (!selected) return
    try {
      if (action === 'extend') await extendDelivery(selected.id, new Date(Date.now() + 30 * 86400000).toISOString())
      if (action === 'reissue') {
        const issued = await issueDelivery(selected.id, true)
        setIssuedLink(issued.deliveryLink)
      }
      if (action === 'revoke') await revokeDelivery(selected.id)
      setNotice(action === 'extend' ? '已将有效期延长 30 日。' : action === 'reissue' ? '已撤销旧令牌并生成新链接。' : '已停止该专属链接。')
      await refresh()
    } catch (error) {
      setNotice((error as ApiError).message)
    }
  }

  async function signOut() {
    await logout().catch(() => undefined)
    onLoggedOut()
  }

  return <section className="section admin-preview-section"><div className="section-heading"><p className="eyebrow">运营管理</p><h2>交付管理台</h2><p>当前数据来自本机 PostgreSQL。资料文件、水印与真实下载将在最后一个文件交付阶段接入。</p><button className="text-button" type="button" onClick={signOut}>退出管理台 →</button></div><div className="admin-summary"><article><span>交付总数</span><strong>{summary.total}</strong><small>全部记录</small></article><article><span>已发放</span><strong>{summary.issued}</strong><small>客户可领取</small></article><article><span>准备中</span><strong>{summary.preparing}</strong><small>等待资料包</small></article><article><span>已停用</span><strong>{summary.revoked}</strong><small>可重新发放</small></article></div><section className="admin-panel admin-issue-panel"><div className="admin-panel-heading"><div><p className="status">新建交付</p><h3>生成客户专属链接</h3></div><span>真实 API</span></div><form className="admin-form" onSubmit={submitDelivery}><div className="admin-form-grid"><label className="admin-field">客户编号<input value={customerCode} onChange={(event) => setCustomerCode(event.target.value)} placeholder="例：C001" /></label><label className="admin-field">客户名称<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="例：株式会社サンプル" /></label><div className="admin-field admin-fixed-field"><span>项目名称</span><strong>ASRAY 勤怠・承認管理システム</strong></div><label className="admin-field">资料包名称<input value={packageName} onChange={(event) => setPackageName(event.target.value)} /></label><div className="admin-field admin-fixed-field"><span>水印文本</span><strong>交付编号生成后由服务器固定</strong></div><label className="admin-field">有效期<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label><label className="admin-field">下载次数<select value={downloadLimit} onChange={(event) => setDownloadLimit(event.target.value)}><option value="1">1 次</option><option value="3">3 次</option><option value="5">5 次</option></select></label></div><div className="admin-form-actions"><p>生成链接不代表资料已交付。只有最后的文件与水印阶段完成并由服务器切换为“已发放”后，客户才可下载。</p><button className="button primary" type="submit">生成专属链接</button></div></form>{issuedLink && <div className="admin-issued-link" role="status"><p><strong>已生成专属链接</strong><span>请复制后通过 WeChat 发给客户；令牌只在当前操作结果中显示。</span></p><a href={issuedLink}>{issuedLink}</a></div>}</section><div className="admin-management"><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><div><p className="status">交付记录</p><h3>客户交付一览</h3></div><span>{totalElements} 条</span></div><div className="admin-filters"><label><span>搜索</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="交付编号或客户名称" /></label><label><span>状态</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as DeliveryStatus | ''); setPage(0) }}><option value="">全部</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="admin-table-wrap"><table><thead><tr><th>交付编号 / 客户</th><th>有效期</th><th>下载</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{records.map((record) => <tr className={record.id === selected?.id ? 'selected' : ''} key={record.id}><td><strong>{record.deliveryNo}</strong><span>{record.customerCode} / {record.customerName}</span></td><td>{formatDate(record.expiresAt)}</td><td>{record.downloadCount} / {record.downloadLimit}</td><td><span className={`admin-status ${statusClass(record.status)}`}>{statusLabels[record.status]}</span></td><td><button className="admin-detail-button" onClick={() => { setSelectedId(record.id); setNotice('') }}>详情</button></td></tr>)}</tbody></table></div><div className="admin-mobile-records">{records.map((record) => <button className="admin-mobile-record" key={record.id} onClick={() => { setSelectedId(record.id); setMobileDetailOpen(true) }}><span className={`admin-status ${statusClass(record.status)}`}>{statusLabels[record.status]}</span><strong>{record.customerCode} / {record.customerName}</strong><small>{record.deliveryNo}</small><div><span>有效期：{formatDate(record.expiresAt)}</span><span>下载：{record.downloadCount} / {record.downloadLimit}</span></div></button>)}</div><div className="admin-pagination"><span>{totalElements === 0 ? '0 条' : `${page * 8 + 1}–${Math.min((page + 1) * 8, totalElements)} / 共 ${totalElements} 条`}</span><div><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>上一页</button><span>{page + 1} / {totalPages}</span><button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>下一页</button></div></div></section>{selected && <aside className="admin-detail" aria-live="polite"><LiveDeliveryDetails record={selected} events={events} notice={notice} onAction={updateSelected} /></aside>}</div>{mobileDetailOpen && selected && <div className="mobile-detail-layer"><button className="mobile-detail-backdrop" aria-label="关闭交付详情" onClick={() => setMobileDetailOpen(false)} /><section className="admin-detail mobile-detail-sheet" role="dialog" aria-modal="true" aria-label="交付详情"><div className="mobile-detail-handle" /><button className="mobile-detail-close" onClick={() => setMobileDetailOpen(false)}>关闭</button><LiveDeliveryDetails record={selected} events={events} notice={notice} onAction={updateSelected} /></section></div>}<section className="admin-audit"><div><p className="status">系统说明</p><h3>交付与下载记录</h3></div><ol><li><time>当前阶段</time><span>交付创建、会话认证、令牌散列、链接撤销、审计记录</span><em>已接通</em></li><li><time>下一阶段</time><span>私有 ZIP / Excel 水印副本和一次性下载票据</span><em>待实现</em></li></ol></section></section>
}

/* Retired static-only management mock. The active route now uses AdminConsole and real API data. */
/*
type AdminDeliveryRecord = {
  id: string
  customer: string
  project: string
  issuedAt: string
  expiresAt: string
  downloadCount: string
  packageName: string
  watermarkText: string
  status: '已发放' | '准备中' | '已过期' | '已停用'
}

type AdminDeliveryAction = 'stop' | 'extend' | 'reissue'

const deliveryProjectName = 'ASRAY 勤怠・承認管理システム'

const demoCustomers = ['C001 / 配布先サンプル', 'C002 / 相談中のお客様', 'C003 / 株式会社 星見', 'C004 / 合同会社 月白', 'C005 / 個人利用者', 'C006 / 株式会社 遠景']
const demoPackages = ['設計書パッケージ（ZIP）', 'テスト資料パッケージ（ZIP）', '個別見積・特別資料（ZIP）']

function createWatermark(customer: string, deliveryNumber: string) {
  const customerCode = customer.slice(0, 4)
  return `ASRAY / ${customerCode} / ${deliveryNumber}`
}

function createDemoRecord(index: number): AdminDeliveryRecord {
  const customer = demoCustomers[index % demoCustomers.length]
  const sequence = String(index + 1).padStart(4, '0')
  const id = `DL-202607${String(26 - Math.floor(index / 3)).padStart(2, '0')}-${customer.slice(0, 4)}-${sequence}`
  const status = index % 9 === 7 ? '已停用' : index % 7 === 6 ? '已过期' : index % 5 === 4 ? '准备中' : '已发放'
  const expiresAt = status === '准备中' ? '—' : index % 6 === 0 ? '2026-07-29' : `2026-08-${String(4 + (index % 22)).padStart(2, '0')}`
  const limit = index % 3 === 0 ? 1 : index % 3 === 1 ? 3 : 5
  const used = status === '准备中' ? '—' : `${Math.min(index % (limit + 1), limit)} / ${limit}`
  return { id, customer, project: deliveryProjectName, issuedAt: `2026-07-${String(26 - Math.floor(index / 3)).padStart(2, '0')}`, expiresAt, downloadCount: used, packageName: demoPackages[index % demoPackages.length], watermarkText: createWatermark(customer, id), status }
}

const initialAdminRecords = Array.from({ length: 24 }, (_, index) => createDemoRecord(index))

function AdminDeliveryDetails({ record, notice, onAction }: { record: AdminDeliveryRecord, notice: string, onAction: (action: AdminDeliveryAction) => void }) {
  return <><p className="status">交付详情</p><h3>{record.id}</h3><dl><div><dt>客户</dt><dd>{record.customer}</dd></div><div><dt>案件</dt><dd>{record.project}</dd></div><div><dt>资料包</dt><dd>{record.packageName}</dd></div><div><dt>自动水印</dt><dd>{record.watermarkText}</dd></div><div><dt>专属链接</dt><dd>已发放（令牌不在前端展示）</dd></div></dl><div className="admin-detail-actions"><button onClick={() => onAction('extend')}>延长有效期</button><button onClick={() => onAction('reissue')}>重新发放</button><button onClick={() => onAction('stop')}>停止链接</button></div>{notice && <p className="admin-detail-notice" role="status">{notice}</p>}<small>正式实现时，详情数据由 API 提供，所有操作必须写入审计日志。</small></>
}

function AdminPreview() {
  const [records, setRecords] = useState(initialAdminRecords)
  const [customer, setCustomer] = useState('')
  const [packageName, setPackageName] = useState('設計書パッケージ（ZIP）')
  const [expiresAt, setExpiresAt] = useState('2026-08-09')
  const [downloadLimit, setDownloadLimit] = useState('3')
  const [issuedLink, setIssuedLink] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(initialAdminRecords[0].id)
  const [detailNotice, setDetailNotice] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const pageSize = 8

  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchedStatus = statusFilter === 'all' || record.status === statusFilter
    const keyword = search.trim().toLowerCase()
    const matchedSearch = !keyword || [record.id, record.customer, record.project, record.status].join(' ').toLowerCase().includes(keyword)
    return matchedStatus && matchedSearch
  }), [records, search, statusFilter])
  const pageCount = Math.max(1, Math.ceil(visibleRecords.length / pageSize))
  const pagedRecords = visibleRecords.slice((page - 1) * pageSize, page * pageSize)
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0]
  const activeCount = records.filter((record) => record.status === '已发放').length
  const expiringCount = records.filter((record) => record.status === '已发放' && record.expiresAt === '2026-07-29').length
  const stoppedCount = records.filter((record) => record.status === '已停用').length

  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  function issueDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextNumber = String(records.length + 1).padStart(4, '0')
    const record: AdminDeliveryRecord = {
      id: `DL-20260726-DEMO-${nextNumber}`,
      customer: customer.trim() || 'お客様サンプル',
      project: deliveryProjectName,
      issuedAt: '2026-07-26',
      expiresAt,
      downloadCount: `0 / ${downloadLimit || '3'}`,
      packageName,
      watermarkText: '',
      status: '已发放',
    }
    record.watermarkText = createWatermark(record.customer, record.id)
    setRecords([record, ...records])
    setSelectedId(record.id)
    setPage(1)
    setIssuedLink('/#delivery?token=demo-astratabi-c001')
  }

  function updateSelectedRecord(action: AdminDeliveryAction) {
    setRecords((current) => current.map((record) => {
      if (record.id !== selectedRecord.id) return record
      if (action === 'stop') return { ...record, status: '已停用' }
      if (action === 'extend') return { ...record, expiresAt: '2026-08-31' }
      return { ...record, status: '已发放', expiresAt: '2026-08-09', downloadCount: '0 / 3' }
    }))
    setDetailNotice(action === 'stop' ? '静态演示：已将该交付变更为停用状态。' : action === 'extend' ? '静态演示：已将有效期延长至 2026-08-31。' : '静态演示：已初始化下载次数，并设为重新发放状态。')
  }

  return (
    <section className="section admin-preview-section">
      <div className="section-heading"><p className="eyebrow">运营管理预览</p><h2>交付管理台</h2><p>用于确认业务流程的静态演示。所有输入与记录仅在当前浏览器显示中有效，不会保存或实际发送。</p></div>
      <div className="admin-summary">
        <article><span>交付总数</span><strong>{records.length}</strong><small>全部记录</small></article>
        <article><span>发放中</span><strong>{activeCount}</strong><small>客户可领取</small></article>
        <article><span>即将到期</span><strong>{expiringCount}</strong><small>3 日内（演示）</small></article>
        <article><span>已停用</span><strong>{stoppedCount}</strong><small>可重新发放</small></article>
      </div>
      <section className="admin-panel admin-issue-panel">
        <div className="admin-panel-heading"><div><p className="status">新建交付</p><h3>生成客户专属链接</h3></div><span>演示</span></div>
        <form className="admin-form" onSubmit={issueDelivery}>
          <div className="admin-form-grid">
            <label className="admin-field">客户 / 交付对象<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="例：C003 / 株式会社サンプル" /></label>
            <div className="admin-field admin-fixed-field"><span>项目名称</span><strong>{deliveryProjectName}</strong></div>
            <label className="admin-field">资料包<select value={packageName} onChange={(event) => setPackageName(event.target.value)}>{demoPackages.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="admin-field admin-fixed-field"><span>水印文本</span><strong>交付编号生成后自动创建</strong></div>
            <label className="admin-field">有效期<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
            <label className="admin-field">下载次数<select value={downloadLimit} onChange={(event) => setDownloadLimit(event.target.value)}><option value="1">1 次</option><option value="3">3 次</option><option value="5">5 次</option></select></label>
          </div>
          <div className="admin-form-actions"><p>正式实现时，需在确认收款、上传 ZIP、服务端生成交付编号与水印、生成受取令牌后，才允许发放。</p><button className="button primary" type="submit">生成专属链接</button></div>
        </form>
        {issuedLink && <div className="admin-issued-link" role="status"><p><strong>已生成演示链接</strong><span>静态版会打开固定的客户受取页面。</span></p><a href={issuedLink}>{issuedLink}</a><small>自动水印：{selectedRecord.watermarkText} ／ 下载上限：{downloadLimit || '3'} 次</small></div>}
      </section>
      <div className="admin-management">
        <section className="admin-panel admin-list-panel">
          <div className="admin-panel-heading"><div><p className="status">交付记录</p><h3>客户交付一览</h3></div><span>{visibleRecords.length} 条</span></div>
          <div className="admin-filters">
            <label><span>搜索</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="交付编号或客户名称" /></label>
            <label><span>状态</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option value="all">全部</option><option value="已发放">已发放</option><option value="准备中">准备中</option><option value="已过期">已过期</option><option value="已停用">已停用</option></select></label>
          </div>
          <div className="admin-table-wrap"><table><thead><tr><th>交付编号 / 客户</th><th>发放日</th><th>有效期</th><th>下载</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{pagedRecords.map((record) => <tr className={record.id === selectedRecord.id ? 'selected' : ''} key={record.id}><td><strong>{record.id}</strong><span>{record.customer}</span></td><td>{record.issuedAt}</td><td>{record.expiresAt}</td><td>{record.downloadCount}</td><td><span className={`admin-status ${record.status === '已发放' ? 'issued' : record.status === '已停用' ? 'stopped' : 'pending'}`}>{record.status}</span></td><td><button className="admin-detail-button" onClick={() => { setSelectedId(record.id); setDetailNotice('') }}>详情</button></td></tr>)}</tbody></table></div>
          <div className="admin-mobile-records">{pagedRecords.map((record) => <button className="admin-mobile-record" key={record.id} onClick={() => { setSelectedId(record.id); setDetailNotice(''); setMobileDetailOpen(true) }}><span className={`admin-status ${record.status === '已发放' ? 'issued' : record.status === '已停用' ? 'stopped' : 'pending'}`}>{record.status}</span><strong>{record.customer}</strong><small>{record.id}</small><div><span>有效期：{record.expiresAt}</span><span>下载：{record.downloadCount}</span></div></button>)}</div>
          <div className="admin-pagination"><span>{visibleRecords.length === 0 ? '0 条' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, visibleRecords.length)} / 共 ${visibleRecords.length} 条`}</span><div><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>上一页</button><span>{page} / {pageCount}</span><button onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}>下一页</button></div></div>
        </section>
        <aside className="admin-detail" aria-live="polite"><AdminDeliveryDetails record={selectedRecord} notice={detailNotice} onAction={updateSelectedRecord} /></aside>
      </div>
      {mobileDetailOpen && <div className="mobile-detail-layer"><button className="mobile-detail-backdrop" aria-label="关闭交付详情" onClick={() => setMobileDetailOpen(false)} /><section className="admin-detail mobile-detail-sheet" role="dialog" aria-modal="true" aria-label="交付详情"><div className="mobile-detail-handle" /><button className="mobile-detail-close" onClick={() => setMobileDetailOpen(false)}>关闭</button><AdminDeliveryDetails record={selectedRecord} notice={detailNotice} onAction={updateSelectedRecord} /></section></div>}
      <section className="admin-audit"><div><p className="status">下载日志 / 演示</p><h3>受取与下载记录</h3></div><ol><li><time>2026-07-26 10:32 JST</time><span>{selectedRecord.id}</span><em>已生成专属链接</em></li><li><time>—</time><span>下载事件</span><em>后续连接 API 后记录</em></li></ol></section>
      <div className="admin-api"><p className="status">后续后台 API</p><code>{futureAdminEndpoints.join('\n')}</code></div>
    </section>
  )
}
*/

export default App
