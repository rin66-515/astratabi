import { FormEvent, useEffect, useState } from 'react'
import logo from './assets/astratabi-logo-main.png'
import { futureAdminEndpoints, getDeliveryByToken, type DeliveryLookup } from './api/client'

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
type Page = PublicPage | 'delivery' | 'admin-preview'
type Route = { page: Page, token?: string }

const pageMeta: Record<Page, { number: string, label: string }> = {
  home: { number: '00', label: 'AstraTabi' },
  story: { number: '01', label: '物語' },
  diary: { number: '02', label: '一句日記' },
  japanese: { number: '03', label: 'IT 日本語' },
  resources: { number: '04', label: '資料・交付' },
  support: { number: '05', label: 'お客様サポート' },
  delivery: { number: 'DL', label: '専用受取' },
  'admin-preview': { number: 'AD', label: '配布管理' },
}

function routeFromHash(): Route {
  const [routeName, query = ''] = window.location.hash.replace(/^#/, '').split('?')
  const publicPages = ['home', ...navItems.map(([id]) => id)] as string[]
  if (routeName === 'delivery') return { page: 'delivery', token: new URLSearchParams(query).get('token') ?? undefined }
  if (routeName === 'admin-preview') return { page: 'admin-preview' }
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
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>Menu</button>
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
      {route.page === 'admin-preview' && <AdminPreview />}

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

function Resources() { return <section className="section resources-section"><div className="section-heading"><p className="eyebrow">04 / Resources & delivery</p><h2>資料・交付について</h2><p>制作資料は、ご依頼内容を確認したうえで個別にご案内します。公開ページから直接ファイルを配布することはありません。</p></div><div className="resources-grid"><article className="package-card"><p className="status">DOCUMENT PACKAGE</p><h3>実務設計書パッケージ</h3><p>要件定義から基本設計・詳細設計・テスト資料まで、案件単位で整理したドキュメント一式です。</p><span>内容・価格は準備中</span></article><article className="package-card"><p className="status">CUSTOM DELIVERY</p><h3>顧客別の安全な交付</h3><p>お支払い確認後、配布先を記録した専用リンクをご案内します。期限とダウンロード回数を個別に管理します。</p><span>専用リンクで受け取り</span></article></div><ol className="fulfillment-flow"><li><span>01</span><div><strong>ご相談・ご依頼</strong><p>お客様サポートへ、ご希望の資料や用途をお知らせください。</p></div></li><li><span>02</span><div><strong>お支払い確認</strong><p>内容を確認後に、ご案内した方法でお手続きいただきます。</p></div></li><li><span>03</span><div><strong>専用リンクを発行</strong><p>確認完了後、お客様だけが使える受取リンクをお送りします。</p></div></li></ol><div className="delivery-cta"><div><p className="status">CLIENT-ONLY LINK</p><h3>専用受取ページは、交付後に直接ご案内します。</h3><p>リンクをお持ちの方は、その URL を開くだけで受取内容を確認できます。</p></div><a className="button outline" href="#delivery?token=demo-astratabi-c001">受取ページの例を見る</a></div></section> }

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
    getDeliveryByToken(initialToken).then((result) => { setLookup(result); setLoading(false) })
  }, [initialToken])

  function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedToken = token.trim()
    if (trimmedToken) window.location.hash = `delivery?token=${encodeURIComponent(trimmedToken)}`
  }

  return <section className="section delivery-section"><div className="section-heading"><p className="eyebrow">Client delivery</p><h2>専用受取ページ</h2><p>このページは、交付時にご案内する専用リンクからのみご利用いただく想定です。</p></div><div className="delivery-gate"><form onSubmit={submitToken}><label htmlFor="delivery-token">受取トークン</label><div><input id="delivery-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="専用リンクのトークンを入力" /><button className="button outline" type="submit">受取内容を確認</button></div><small>デモ用トークン：demo-astratabi-c001</small></form></div>{loading && <p className="delivery-state" aria-live="polite">受取情報を確認しています…</p>}{lookup?.status === 'not-found' && <p className="delivery-state error" role="alert">有効な受取情報を確認できませんでした。ご案内した専用リンクをご確認ください。</p>}{lookup?.status === 'active' && <article className="delivery-preview" aria-live="polite"><div className="preview-title"><span>専用受取情報</span><span>交付準備済み</span></div><h3>{lookup.delivery.projectName}</h3><p className="watermark-note">配布先：{lookup.delivery.recipientLabel} ／ 透かし表示を付与した配布コピー</p><dl><div><dt>配布管理番号</dt><dd>{lookup.delivery.deliveryNumber}</dd></div><div><dt>有効期限</dt><dd>{lookup.delivery.expiresAt}</dd></div><div><dt>残りダウンロード回数</dt><dd>{lookup.delivery.remainingDownloads} 回</dd></div></dl><p className="file-list">{lookup.delivery.files.map((file) => <span key={file}>▣ {file}</span>)}</p><button className="button primary" onClick={() => setDownloadNotice('静的デモのため、実ファイルはまだ発行しません。正式版ではサーバー側の確認後に短時間のみ有効なダウンロードを開始します。')}>ZIP をダウンロード</button>{downloadNotice && <p className="download-notice" role="status">{downloadNotice}</p>}</article>}</section>
}

function AdminPreview() { return <section className="section admin-preview-section"><div className="section-heading"><p className="eyebrow">Private operator preview</p><h2>配布管理フロー</h2><p>公開ナビゲーションには表示しない、運用確認用のモックです。正式版では管理者認証を必須にします。</p></div><div className="admin-flow"><article><span>01</span><h3>入金確認</h3><p>注文情報と支払い状況を確認します。</p></article><article><span>02</span><h3>配布コピー作成</h3><p>顧客・管理番号入りの ZIP を登録します。</p></article><article><span>03</span><h3>専用リンク発行</h3><p>期限と回数を設定し、受取 URL を発行します。</p></article></div><div className="admin-api"><p className="status">FUTURE ADMIN API</p><code>{futureAdminEndpoints.join('\n')}</code></div></section> }

export default App
