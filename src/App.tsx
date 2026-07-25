import { useEffect, useState } from 'react'
import logo from './assets/astratabi-logo-main.png'
import { futureAdminEndpoints, getDeliveryByToken, type DeliverySummary } from './api/client'

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
  ['story', '物語'], ['diary', '一句日記'], ['japanese', 'IT 日本語'], ['delivery', '交付物受取'], ['support', 'お客様サポート'],
] as const

type Page = 'home' | (typeof navItems)[number][0]

function pageFromHash(): Page {
  const page = window.location.hash.replace('#', '')
  const validPages = ['home', ...navItems.map(([id]) => id)] as string[]
  return (validPages.includes(page) ? page : 'home') as Page
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [page, setPage] = useState<Page>(pageFromHash)
  const [delivery, setDelivery] = useState<DeliverySummary | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    const syncPage = () => { setPage(pageFromHash()); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  async function previewDelivery() { setDelivery(await getDeliveryByToken('demo-token')) }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="AstraTabi ホーム"><img src={logo} alt="" /><span>AstraTabi</span></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>Menu</button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="メインナビゲーション">
          {navItems.map(([id, label]) => <a className={page === id ? 'active' : ''} href={`#${id}`} key={id}>{label}</a>)}
        </nav>
      </header>

      {page === 'home' && <Home />}
      {page === 'story' && <Story />}
      {page === 'diary' && <Diary />}
      {page === 'japanese' && <Japanese />}
      {page === 'delivery' && <Delivery delivery={delivery} previewDelivery={previewDelivery} clearDelivery={() => setDelivery(null)} />}
      {page === 'support' && <Support />}

      <section className="admin-teaser" aria-label="管理画面の説明"><div><p className="eyebrow">For administrator</p><h2>配布管理は、表には出さない。</h2><p>入金確認、顧客別 ZIP の登録、リンク発行、期限・回数の管理は管理画面で行います。</p></div><button className="text-button" onClick={() => setShowAdmin(!showAdmin)}>{showAdmin ? '管理画面の説明を閉じる' : '管理画面の設計を見る'} →</button>{showAdmin && <div className="admin-demo"><p>管理 UI（第一版は非公開・モック）</p><div className="admin-cards"><span>顧客・案件</span><span>配布パッケージ</span><span>ダウンロード履歴</span></div><code>{futureAdminEndpoints.join('\n')}</code></div>}</section>

      <footer><a className="brand" href="#home"><img src={logo} alt="" /><span>AstraTabi</span></a><p>雲と月をたずさえて、遠くへ。</p><small>© 2026 AstraTabi. Built slowly, with intention.</small></footer>
    </main>
  )
}

function Home() {
  return <>
    <section className="portrait-hero" aria-labelledby="hero-title">
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><span className="floating-star f-one">✦</span><span className="floating-star f-two">·</span>
      <div className="portrait-intro"><p className="eyebrow">AstraTabi / 雲と月をたずさえて、遠くへ。</p><p className="home-label">Self-taught. Still becoming.</p><h1 id="hero-title">遠回りを、<br /><i>自分だけの軌跡に。</i></h1><p className="hero-copy">フロントエンドを独学で仕事にし、日本語を独学で<br />JLPT N1 180/180 へ。学び続けた日々を、作品と言葉に変えていく。</p><div className="hero-actions"><a className="button primary" href="#story">私の旅路を読む</a><a className="button quiet" href="#support">お客様サポート</a></div></div>
      <aside className="identity-card"><span className="card-dot" /><p>THE QUIET BUILDER</p><strong>Learn deeply.<br />Build gently.<br />Go far.</strong><small>Frontend / Japanese / Records</small></aside>
    </section>
    <section className="home-proof"><p className="eyebrow">Made from persistence</p><div className="proof-grid"><article><span>01</span><h2>独学で、<br />仕事へ。</h2><p>わからないことを、調べる。つくる。直す。小さな繰り返しを、前へ進む力に変えてきました。</p></article><article className="score-card"><span>02</span><p className="score-caption">Japanese self-study</p><strong>180<span>/180</span></strong><p>JLPT N1<br />満点</p></article><article><span>03</span><h2>記録して、<br />育てていく。</h2><p>一句の日記、技術の学び、遠回りの試行錯誤。昨日の自分を超えるための、静かなアーカイブです。</p></article></div>
    </section>
    <section className="home-lab"><div><p className="eyebrow">The way I make</p><h2>コードも言葉も、<br />相手に届くところまで。</h2><p>速さだけを追わず、意図を理解して、きちんと形にする。学びの過程そのものも、次の誰かの地図になればいいと思っています。</p><a className="text-link" href="#support">お客様サポートを見る <span>→</span></a></div><div className="code-window" aria-label="フロントエンド制作のイメージ"><div><i /><i /><i /><span>journey.ts</span></div><pre><code><b>const</b> journey = &#123;{`\n`}  learn: <em>'every day'</em>,{`\n`}  build: <em>'with intention'</em>,{`\n`}  direction: <em>'astra'</em>{`\n`}&#125;{`\n\n`}journey.<b>keepGoing</b><span className="cursor">_</span></code></pre></div></section>
  </>
}

function Story() { return <section className="section story"><div className="section-heading"><p className="eyebrow">01 / Story</p><h2>八千里路、雲と月</h2></div><div className="story-grid"><p className="lead">「遠い場所」は、地図の端ではなく、まだ名前のない自分の中にある。</p><div><p>雲のように移ろいながら、月のように静かに進む。学び、つくり、誰かと話す日々を、旅の断片として残していきます。</p><a className="text-link" href="#diary">日々の記録へ <span>→</span></a></div></div><ol className="timeline"><li><span>START</span>独学から、できることを一つずつ増やす</li><li><span>NOW</span>個人 IP と創作の拠点を育てる</li><li><span>FAR</span>旅の途中で出会う景色を、次の物語にする</li></ol></section> }

function Diary() { return <section className="section soft-section"><div className="section-heading"><p className="eyebrow">02 / One line a day</p><h2>一句日記</h2><p>短い言葉で、今日を置いていく。</p></div><div className="diary-list">{diary.map((entry) => <article className="diary-card" key={entry.date}><div><span>{entry.date}</span><em>{entry.tag}</em></div><p>{entry.text}</p></article>)}</div><button className="text-button" type="button">日記アーカイブは準備中です　→</button></section> }

function Japanese() { return <section className="section"><div className="section-heading"><p className="eyebrow">03 / IT Japanese corner</p><h2>IT 日本語・交流角</h2><p>独学で N1 にたどり着いたからこそ、言葉で迷う時間にも伴走したい。</p></div><div className="japanese-grid">{japanesePosts.map((post) => <article className="word-card" key={post.word}><span>{post.type}</span><h3>{post.word}</h3><p className="reading">{post.reading}</p><p>{post.meaning}</p></article>)}</div><div className="notice"><strong>投稿は準備中です。</strong><span>公開前に内容を確認する、安心できる交流の場として設計しています。</span></div></section> }

function Support() { return <section className="section support-section"><div className="section-heading"><p className="eyebrow">Customer support</p><h2>お客様サポート</h2><p>ご相談・ご依頼・交付物については、WeChat のお客様サポートまでご連絡ください。</p></div><div className="support-panel"><div className="qr-placeholder" aria-label="WeChat QR コードの掲載予定"><span>WECHAT</span><b>+</b><i>QR</i></div><div><p className="status">WECHAT SUPPORT</p><h3>お客様サポート</h3><p>ご依頼の背景や、ご希望の内容をお知らせください。内容を確認後、対応方法をご案内します。</p><dl className="support-details"><div><dt>WeChat ID</dt><dd>公開準備中</dd></div><div><dt>対応内容</dt><dd>ご相談・ご依頼・交付物のお問い合わせ</dd></div><div><dt>ご案内</dt><dd>お支払い確認後、専用の交付リンクを発行します</dd></div></dl><p className="small-note">WeChat ID または QR コードを確定後、ここに掲載します。</p></div></div></section> }

function Delivery({ delivery, previewDelivery, clearDelivery }: { delivery: DeliverySummary | null, previewDelivery: () => Promise<void>, clearDelivery: () => void }) { return <section className="section delivery-section"><div className="section-heading"><p className="eyebrow">Client delivery</p><h2>交付物を受け取る</h2><p>お支払い確認後に、個別にご案内した専用リンクからお受け取りいただけます。</p></div><div className="delivery-panel"><div><p className="status">DEMO MODE</p><h3>顧客別設計書一式配布</h3><p>Excel 設計書一式を、配布先・管理番号・日付入りのウォーターマーク付き ZIP としてお渡しします。</p><ul><li>専用リンク・有効期限・回数制限</li><li>ダウンロード履歴の記録</li><li>原本は変更せず、顧客ごとの配布コピーを生成</li></ul></div><button className="button outline" onClick={previewDelivery}>受取画面を確認する</button></div>{delivery && <article className="delivery-preview" aria-live="polite"><div className="preview-title"><span>DEMO / 専用受取画面</span><button onClick={clearDelivery}>閉じる ×</button></div><h3>{delivery.projectName}</h3><dl><div><dt>配布管理番号</dt><dd>{delivery.deliveryNumber}</dd></div><div><dt>有効期限</dt><dd>{delivery.expiresAt}</dd></div><div><dt>残りダウンロード回数</dt><dd>{delivery.remainingDownloads} 回</dd></div></dl><p className="file-list">{delivery.files.map((file) => <span key={file}>▣ {file}</span>)}</p><button className="button disabled" disabled>ZIP をダウンロード（実装準備中）</button></article>}</section> }

export default App
