import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import logo from './assets/astratabi-logo-main.png'
import entranceScene from './assets/yunyue-shop-entrance-v1.webp'
import { selectSignMessage } from './lib/selectSignMessage'
import {
  archivePackageRelease,
  createDelivery,
  extendDelivery,
  getAdminDeliveries,
  getAdminEvents,
  getAdminSession,
  getAdminSummary,
  getPackageReleases,
  getDeliveryByToken,
  issueDelivery,
  login,
  logout,
  requestDownloadTicket,
  revokeDelivery,
  uploadPackageRelease,
  type AdminDelivery,
  type ApiError,
  type DeliveryEvent,
  type DeliveryLookup,
  type PackageRelease,
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
  ['tavern', '酒桌'], ['library', '藏书楼'], ['workshop', '百工坊'], ['pavilion', '长亭'], ['road', '云月路'], ['courtyard', '后院'],
] as const

type PublicPage = 'home' | 'not-found' | (typeof navItems)[number][0]
type Page = PublicPage | 'delivery' | 'admin'
type Route = { page: Page, token?: string }

const pageMeta: Record<Page, { number: string, label: string }> = {
  home: { number: '00', label: '云月小铺' },
  tavern: { number: '01', label: '酒桌' },
  library: { number: '02', label: '藏书楼' },
  workshop: { number: '03', label: '百工坊' },
  pavilion: { number: '04', label: '长亭' },
  road: { number: '05', label: '云月路' },
  courtyard: { number: '06', label: '后院' },
  'not-found': { number: '？', label: '未行之路' },
  delivery: { number: 'DL', label: '专属交付' },
  admin: { number: 'AD', label: '配布管理' },
}

function routeFromHash(): Route {
  const [routeName, query = ''] = window.location.hash.replace(/^#/, '').split('?')
  const publicPages = navItems.map(([id]) => id) as string[]
  if (routeName === 'delivery') return { page: 'delivery', token: new URLSearchParams(query).get('token') ?? undefined }
  if (routeName === 'admin' || routeName === 'admin-preview') return { page: 'admin' }
  if (!routeName || routeName === 'home' || routeName === 'shop') return { page: 'home' }
  return { page: publicPages.includes(routeName) ? routeName as PublicPage : 'not-found' }
}

function hasEnteredShop() {
  try {
    return window.sessionStorage.getItem('yunyue-shop-entered') === 'true'
  } catch {
    return false
  }
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [entered, setEntered] = useState(hasEnteredShop)
  const [opening, setOpening] = useState(false)
  const activePage = pageMeta[route.page]
  const isPrivateRoute = route.page === 'admin' || route.page === 'delivery'

  useEffect(() => {
    const syncRoute = () => {
      setRoute(routeFromHash())
      setMenuOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  function enterShop() {
    if (route.page === 'not-found') {
      window.history.replaceState(null, '', '#home')
      setRoute({ page: 'home' })
    }
    setOpening(true)
    window.setTimeout(() => {
      try {
        window.sessionStorage.setItem('yunyue-shop-entered', 'true')
      } catch {
        // Storage is optional; entering the shop must still work.
      }
      setEntered(true)
      setOpening(false)
    }, 900)
  }

  function leaveShop() {
    try {
      window.sessionStorage.removeItem('yunyue-shop-entered')
    } catch {
      // Storage is optional; the local state still returns to the entrance.
    }
    setMenuOpen(false)
    setOpening(false)
    if (window.location.hash !== '#home') {
      window.location.hash = 'home'
    }
    setEntered(false)
  }

  if (!isPrivateRoute && !entered) {
    return <ShopEntrance opening={opening} onEnter={enterShop} />
  }

  return (
    <main className={route.page === 'admin' ? 'admin-shell' : 'shop-shell'}>
      <aside className="wide-rail" aria-hidden="true"><span>{activePage.number}</span><i /><small>{activePage.label}</small></aside>
      <header className={`site-header${route.page === 'admin' ? ' admin-site-header' : ''}`}>
        <a className="brand" href="#home" aria-label="云月小铺"><img src={logo} alt="" /><span>云月小铺</span></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}><span /><span /><span /></button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="小铺导航">
          {route.page !== 'admin' && navItems.map(([id, label]) => <a className={route.page === id ? 'active' : ''} href={`#${id}`} key={id}>{label}</a>)}
          {!isPrivateRoute && <button className="leave-shop" type="button" onClick={leaveShop}>掩门离去</button>}
        </nav>
      </header>

      {route.page === 'home' && <ShopHome />}
      {route.page === 'tavern' && <Tavern />}
      {route.page === 'library' && <Library />}
      {route.page === 'workshop' && <Workshop />}
      {route.page === 'pavilion' && <Pavilion />}
      {route.page === 'road' && <CloudRoad />}
      {route.page === 'courtyard' && <Courtyard />}
      {route.page === 'not-found' && <ShopNotFound />}
      {route.page === 'delivery' && <Delivery initialToken={route.token} />}
      {route.page === 'admin' && <AdminConsole />}

      {route.page !== 'admin' && <footer><a className="brand" href="#home"><img src={logo} alt="" /><span>云月小铺</span></a><p>云聚云散，月有圆缺。</p><small>店小二还在赶路，灯会一直留着。</small></footer>}
    </main>
  )
}

const shopRooms = [
  { id: 'tavern', name: '酒桌', note: '日常、思考与一路见闻', mark: '一盏酒' },
  { id: 'library', name: '藏书楼', note: '技术、日本 IT 与读书札记', mark: '一卷书' },
  { id: 'workshop', name: '百工坊', note: '项目、设计书与做过的作品', mark: '一件物' },
  { id: 'pavilion', name: '长亭', note: '音乐、摄影、旅行与远方', mark: '一程路' },
  { id: 'road', name: '云月路', note: '一部慢慢写下去的故事', mark: '一页纸' },
  { id: 'courtyard', name: '后院', note: '工具、源码与留下的痕迹', mark: '一扇门' },
] as const

const entrancePlaques = [
  { title: '无事', detail: '今日无事，且坐听风' },
  { title: '听雨', detail: '雨落屋檐，慢些再走' },
  { title: '慢行', detail: '路远不急，一步一程' },
  { title: '平安', detail: '愿来路无恙，归途有灯' },
] as const

type PlaqueMotionStyle = CSSProperties & {
  '--plaque-angle': string
  '--plaque-delay': string
  '--plaque-duration': string
  '--plaque-sway': string
}

function ShopEntrance({ opening, onEnter }: { opening: boolean; onEnter: () => void }) {
  const [activePlaque, setActivePlaque] = useState<number | null>(null)
  const plaqueMotion = useMemo<PlaqueMotionStyle[]>(() => entrancePlaques.map(() => ({
    '--plaque-angle': `${(Math.random() * 5 - 2.5).toFixed(2)}deg`,
    '--plaque-delay': `${(-Math.random() * 8).toFixed(2)}s`,
    '--plaque-duration': `${(6.2 + Math.random() * 2.2).toFixed(2)}s`,
    '--plaque-sway': `${(.8 + Math.random() * 1.4).toFixed(2)}deg`,
  })), [])

  return <main className={`shop-entrance${opening ? ' opening' : ''}`}>
    <img className="entrance-scene" src={entranceScene} alt="" />
    <div className="entrance-mist" aria-hidden="true" />
    <div className="entrance-warmth" aria-hidden="true" />
    <aside className="entrance-wish-plaques" aria-label="来客留下的无事牌">
      {entrancePlaques.map((plaque, index) => <button
        className={activePlaque === index ? 'active' : ''}
        style={plaqueMotion[index]}
        type="button"
        aria-label={`${plaque.title}木牌：${plaque.detail}`}
        aria-pressed={activePlaque === index}
        onClick={() => setActivePlaque(activePlaque === index ? null : index)}
        key={plaque.title}
      >
        <span className="entrance-plaque-card" aria-hidden="true">
          <span className="entrance-plaque-face entrance-plaque-front">{plaque.title}</span>
          <span className="entrance-plaque-face entrance-plaque-back">{plaque.detail}</span>
        </span>
      </button>)}
    </aside>
    <section className="entrance-copy" aria-labelledby="entrance-title">
      <p className="entrance-kicker">云月小铺</p>
      <h1 id="entrance-title">极东有一间刚开业的小铺。</h1>
      <p>酒刚温。</p>
      <p>灯刚亮。</p>
      <p>若不急着赶路。</p>
      <p>不妨进来坐坐。</p>
      <button type="button" onClick={onEnter} disabled={opening}>{opening ? '灯影渐近……' : '推门而入'}</button>
    </section>
  </main>
}

function ShopHome() {
  const sign = selectSignMessage()
  return <>
    <section className="shop-hero" aria-labelledby="shop-title">
      <div className="shop-moon" aria-hidden="true" />
      <div className="shop-intro">
        <p className="eyebrow">A quiet shop at the end of the road</p>
        <h1 id="shop-title">云月小铺</h1>
        <p className="shop-subtitle">云聚云散，月有圆缺。</p>
        <p className="shop-prologue">掌柜外出云游中。<br />眼下这间铺子，由店小二照看。</p>
      </div>
      <aside className="wood-sign" aria-label="今日木牌">
        <span className="sign-rope" aria-hidden="true" />
        <i className="sign-nail nail-left" aria-hidden="true" />
        <i className="sign-nail nail-right" aria-hidden="true" />
        <small>今日木牌</small>
        {sign.message.lines.map((line) => <p key={line}>{line}</p>)}
        <span className="sign-seal" aria-label="店小二八千">八千</span>
      </aside>
    </section>
    <section className="shop-map" aria-labelledby="rooms-title">
      <div className="section-heading">
        <p className="eyebrow">Inside the shop</p>
        <h2 id="rooms-title">随意走走</h2>
        <p>这里不卖身份，也不陈列履历。只把一路所得，分门别类地放进几间屋子。</p>
      </div>
      <div className="room-grid">
        {shopRooms.map((room) => <a className="room-card" href={`#${room.id}`} key={room.id}>
          <span>{room.mark}</span><h3>{room.name}</h3><p>{room.note}</p><i>推门看看</i>
        </a>)}
      </div>
      <p className="shop-about">来人间凑数的日子。</p>
    </section>
  </>
}

function RoomHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="section-heading"><p className="eyebrow">{number} / 云月小铺</p><h2>{title}</h2><p>{description}</p></div>
}

function UnderRenovation({ room, children }: { room: string; children?: string }) {
  return <div className="renovation-note"><span aria-hidden="true">修</span><div><h3>{room}还在收拾。</h3><p>{children ?? '木料已经备好，等店小二慢慢拾掇。改日再来，或许就能看见新的模样。'}</p></div></div>
}

function ShopSignature({ children }: { children: string }) {
  return <p className="content-signature"><span>八千</span>{children}</p>
}

function Tavern() {
  return <section className="section room-section soft-section"><RoomHeading number="01" title="酒桌" description="坐下来以后，不必急着谈正事。这里留下日常、工作、旅行与偶尔冒出来的念头。" />
    <div className="diary-list">{diary.map((entry) => <article className="diary-card" key={entry.date}><div><span>{entry.date}</span><em>{entry.tag}</em></div><p>{entry.text}</p></article>)}</div>
    <ShopSignature>记</ShopSignature>
    <UnderRenovation room="酒桌的里间">旧日记和旅途见闻仍在整理，眼下先留三句话作陪。</UnderRenovation>
  </section>
}

function Library() {
  return <section className="section room-section"><RoomHeading number="02" title="藏书楼" description="读过的书、踩过的坑、做项目时查明白的事情，都在这里重新归档。" />
    <div className="japanese-grid">{japanesePosts.map((post) => <article className="word-card" key={post.word}><span>{post.type}</span><h3>{post.word}</h3><p className="reading">{post.reading}</p><p>{post.meaning}</p></article>)}</div>
    <div className="shelf-tags" aria-label="藏书分类"><span>Java</span><span>Spring</span><span>Docker</span><span>AWS</span><span>日本 IT</span><span>数据库</span><span>设计模式</span></div>
    <section className="contribution-desk" aria-labelledby="contribution-title">
      <div className="desk-intro"><p className="status">共书案 · 装修中</p><h3 id="contribution-title">留下一句工作中遇见的日语</h3><p>来客留下原句和自己的理解，店小二查证、补充以后，再收入藏书楼。投稿不会未经整理直接公开。</p></div>
      <form className="contribution-form" onSubmit={(event) => event.preventDefault()}>
        <label>IT 日语或表达<input placeholder="例：切り分け" /></label>
        <label>读音<input placeholder="例：きりわけ" /></label>
        <label className="form-wide">使用场景或自己的理解<textarea rows={3} placeholder="在哪里见到、当时如何使用，或者想确认什么。" /></label>
        <label className="form-wide">例句或提问<textarea rows={3} placeholder="可以留下原句，也可以写给店小二的问题。" /></label>
        <label>留名（可选）<input placeholder="不留名也无妨" /></label>
        <button type="submit" disabled>墨未干，暂不能投递</button>
      </form>
      <small>真实投稿接口与后台整理功能将在下一阶段开放。</small>
    </section>
    <ShopSignature>整理</ShopSignature>
    <UnderRenovation room="二楼书架">系统化笔记正在誊写。开放前，先不摆放只有标题的空书。</UnderRenovation>
  </section>
}

function Workshop() {
  return <section className="section room-section resources-section"><RoomHeading number="03" title="百工坊" description="这里不卖课程。这里只放亲手做过、反复修改过、能够说明来路的作品。" />
    <div className="resources-grid"><article className="package-card"><p className="status">模拟实战项目</p><h3>ASRAY 日本 IT 项目</h3><p>从要件定义、基本设计、详细设计，到 API、数据库、制造、测试与 Release 的完整项目记录。</p><span>作品仍在持续制作</span></article><article className="package-card"><p className="status">专属交付</p><h3>客户资料交付</h3><p>确认后通过专属链接交付，记录有效期与下载次数。真实文件与水印生成将在后续接入。</p><a className="text-link" href="#delivery">持有链接的客人请进 →</a></article></div>
    <div className="counter-card"><div><p className="status">柜台</p><h3>有事可以找店小二</h3><p>项目资料、交付物与合作事宜，通过微信人工确认。联系方式正式公开前，柜台暂不接单。</p></div><span>お客様サポート · 装修中</span></div>
  </section>
}

function Pavilion() {
  return <section className="section room-section soft-section"><RoomHeading number="04" title="长亭" description="有人在这里送别，也有人从这里启程。以后会放吉他、摄影、旅行和路上的风。" /><UnderRenovation room="长亭">琴弦尚未调好，远行的照片也还没有装框。</UnderRenovation></section>
}

function CloudRoad() {
  return <section className="section room-section"><RoomHeading number="05" title="云月路" description="这不是履历，而是一条慢慢写下去的路。店小二走着走着，也许终有一天会遇见掌柜。" />
    <article className="story-scroll"><small>卷一 · 尚未落笔</small><h3>小铺初开</h3><p>那一年，极东的风吹了很久。有人在路边点起一盏灯，又在门上挂了一块新木牌。</p><p>来客问：“掌柜何在？”</p><p>小二擦了擦桌子，只说：“还在未来。”</p></article>
    <ShopSignature>记</ShopSignature>
    <UnderRenovation room="后续章节">故事已经起了头，余下的路要一边生活，一边写。</UnderRenovation>
  </section>
}

function Courtyard() {
  return <section className="section room-section courtyard-section"><RoomHeading number="06" title="后院" description="前铺招待来客，后院留下工具、源码与做事的痕迹。" />
    <div className="backyard-gate"><p>门没有上锁。</p><h3>若想看看这间小铺是怎样搭起来的，便从这里出去。</h3><a className="button outline" href="https://github.com/rin66-515" target="_blank" rel="noreferrer">推开后门</a></div>
    <UnderRenovation room="后院工棚">更多工具和公开作品仍在整理，暂时不要被地上的木屑绊倒。</UnderRenovation>
  </section>
}

function ShopNotFound() {
  return <section className="section shop-not-found"><p className="eyebrow">An untrodden path</p><h2>你走的这条路，还没有人来过。</h2><p>这间屋子暂时还没有开门。<br />不妨回小铺里，去别处坐坐。</p><a className="button outline" href="#home">回到小铺</a></section>
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
  const [slowLoading, setSlowLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [downloadNotice, setDownloadNotice] = useState('')

  useEffect(() => {
    setToken(initialToken ?? '')
    setDownloadNotice('')
    setLoadFailed(false)
    setSlowLoading(false)
    if (!initialToken) { setLookup(null); setLoading(false); return }
    setLoading(true)
    const slowTimer = window.setTimeout(() => setSlowLoading(true), 1600)
    getDeliveryByToken(initialToken)
      .then(setLookup)
      .catch(() => setLoadFailed(true))
      .finally(() => {
        window.clearTimeout(slowTimer)
        setLoading(false)
      })
    return () => window.clearTimeout(slowTimer)
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

  return <section className="section delivery-section"><div className="section-heading"><p className="eyebrow">Client delivery</p><h2>专属取件处</h2><p>持有店小二发出的专属链接，即可在这里确认交付内容。</p></div><div className="delivery-gate"><form onSubmit={submitToken}><label htmlFor="delivery-token">取件凭证</label><div><input id="delivery-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="输入专属链接中的凭证" /><button className="button outline" type="submit">确认交付内容</button></div><small>通过专属链接进入时，会自动显示对应的交付信息。</small></form></div>{loading && <p className="delivery-state" aria-live="polite">{slowLoading ? '酒快温好了。' : '掌柜正在温酒……'}</p>}{loadFailed && <p className="delivery-state error" role="alert">风太大，灯晃了一下。稍后再试。</p>}{lookup?.status === 'not-found' && <p className="delivery-state error" role="alert">没有找到这份交付。请确认店小二发给你的专属链接是否完整。</p>}{lookup && lookup.status !== 'not-found' && <article className="delivery-preview" aria-live="polite"><div className="preview-title"><span>专属交付信息</span><span>{lookup.status === 'active' ? '可以取件' : lookup.status === 'preparing' ? '仍在准备' : '有效期已结束'}</span></div><h3>{lookup.delivery.projectName}</h3><p className="watermark-note">交付对象：{lookup.delivery.recipientLabel} ／ {lookup.delivery.message}</p><dl><div><dt>交付管理编号</dt><dd>{lookup.delivery.deliveryNumber}</dd></div><div><dt>有效期</dt><dd>{lookup.delivery.expiresAt}</dd></div><div><dt>剩余下载次数</dt><dd>{lookup.delivery.remainingDownloads} 次</dd></div></dl><p className="file-list"><span>▣ {lookup.delivery.packageName}</span></p>{lookup.status === 'active' && <button className="button primary" onClick={startDownload}>下载 ZIP</button>}{downloadNotice && <p className="download-notice" role="status">{downloadNotice}</p>}</article>}</section>
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
  return <><p className="status">交付详情</p><h3>{record.deliveryNo}</h3><dl><div><dt>客户</dt><dd>{record.customerCode} / {record.customerName}</dd></div><div><dt>案件</dt><dd>{record.projectName}</dd></div><div><dt>母版资料包</dt><dd>{record.packageName}{record.packageVersion ? ` / v${record.packageVersion}` : ' / 旧数据'}</dd></div><div><dt>自动水印</dt><dd>{record.watermarkText}</dd></div><div><dt>下载次数</dt><dd>{record.downloadCount} / {record.downloadLimit}</dd></div></dl><div className="admin-detail-actions"><button onClick={() => onAction('extend')}>延长 30 日</button><button onClick={() => onAction('reissue')}>重新发放</button><button onClick={() => onAction('revoke')}>停止链接</button></div>{notice && <p className="admin-detail-notice" role="status">{notice}</p>}<small>{record.status === 'PREPARING' ? '母版版本已经固定；客户水印副本尚未生成，当前链接只显示“准备中”，不会消耗下载次数。' : '所有状态变更和下载事件均由服务端记录。'}</small>{events.length > 0 && <ol className="admin-event-list">{events.slice(0, 4).map((event) => <li key={`${event.occurredAt}-${event.eventType}`}><time>{formatDate(event.occurredAt)}</time><span>{event.eventType}</span></li>)}</ol>}</>
}

function AdminWorkspace({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [records, setRecords] = useState<AdminDelivery[]>([])
  const [packageReleases, setPackageReleases] = useState<PackageRelease[]>([])
  const [summary, setSummary] = useState<DeliverySummaryCounts>({ total: 0, issued: 0, preparing: 0, revoked: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<DeliveryEvent[]>([])
  const [customerCode, setCustomerCode] = useState('C001')
  const [customerName, setCustomerName] = useState('')
  const [packageReleaseId, setPackageReleaseId] = useState('')
  const [archiveFile, setArchiveFile] = useState<File | null>(null)
  const [checksumFile, setChecksumFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [packageNotice, setPackageNotice] = useState('')
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

  function refreshPackages() {
    return getPackageReleases(true)
      .then((releases) => {
        setPackageReleases(releases)
        const active = releases.filter((release) => release.status === 'ACTIVE')
        setPackageReleaseId((current) => active.some((release) => release.id === current) ? current : active[0]?.id ?? '')
      })
      .catch((error: ApiError) => setPackageNotice(error.message))
  }

  useEffect(() => { void refresh() }, [page, search, statusFilter])
  useEffect(() => { void refreshPackages() }, [])
  useEffect(() => { if (selectedId) getAdminEvents(selectedId).then(setEvents).catch(() => setEvents([])) }, [selectedId])

  async function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    try {
      if (!packageReleaseId) throw new Error('请先上传并选择一个有效资料包版本。')
      const created = await createDelivery({ customerCode: customerCode.trim(), customerName: customerName.trim(), packageReleaseId, expiresAt: `${expiresAt}T23:59:59+09:00`, downloadLimit: Number(downloadLimit) })
      const issued = await issueDelivery(created.id)
      setIssuedLink(issued.deliveryLink)
      setNotice('已创建交付并生成专属链接。资料包生成完成前，客户页面会显示“准备中”。')
      await refresh()
      setSelectedId(created.id)
    } catch (error) {
      setNotice((error as ApiError).message)
    }
  }

  async function submitPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!archiveFile || !checksumFile) {
      setPackageNotice('请同时选择 ZIP 和对应的 .sha256 文件。')
      return
    }
    setUploading(true)
    setPackageNotice('')
    try {
      const result = await uploadPackageRelease(archiveFile, checksumFile)
      setPackageNotice(result.duplicate ? '该版本与服务器现有文件一致，未重复保存。' : `已登记不可变资料包：${result.release.fileName}`)
      setArchiveFile(null)
      setChecksumFile(null)
      event.currentTarget.reset()
      await refreshPackages()
      setPackageReleaseId(result.release.id)
    } catch (error) {
      setPackageNotice((error as ApiError).message)
    } finally {
      setUploading(false)
    }
  }

  async function archiveRelease(release: PackageRelease) {
    if (!window.confirm(`归档 ${release.fileName}？已存在的交付仍保留该版本，但新交付不能再选择。`)) return
    try {
      await archivePackageRelease(release.id)
      setPackageNotice(`已归档 ${release.fileName}，服务器文件未删除。`)
      await refreshPackages()
    } catch (error) {
      setPackageNotice((error as ApiError).message)
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

  const activeReleases = packageReleases.filter((release) => release.status === 'ACTIVE')

  return <section className="section admin-preview-section">
    <div className="section-heading">
      <p className="eyebrow">运营管理</p><h2>交付管理台</h2>
      <p>当前数据来自本机 PostgreSQL。母版 ZIP 已进入不可变版本管理；客户水印副本和真实下载仍在后续阶段。</p>
      <button className="text-button" type="button" onClick={signOut}>退出管理台 →</button>
    </div>
    <div className="admin-summary">
      <article><span>交付总数</span><strong>{summary.total}</strong><small>全部记录</small></article>
      <article><span>已发放</span><strong>{summary.issued}</strong><small>客户可领取</small></article>
      <article><span>准备中</span><strong>{summary.preparing}</strong><small>等待水印副本</small></article>
      <article><span>已停用</span><strong>{summary.revoked}</strong><small>停止使用</small></article>
    </div>
    <section className="admin-panel admin-package-panel">
      <div className="admin-panel-heading"><div><p className="status">母版管理</p><h3>上传不可变 ZIP 版本</h3></div><span>{activeReleases.length} 个有效版本</span></div>
      <form className="admin-package-upload" onSubmit={submitPackage}>
        <label className="admin-field">ZIP 母版<input type="file" accept=".zip,application/zip" onChange={(event) => setArchiveFile(event.target.files?.[0] ?? null)} /></label>
        <label className="admin-field">SHA-256 校验文件<input type="file" accept=".sha256,text/plain" onChange={(event) => setChecksumFile(event.target.files?.[0] ?? null)} /></label>
        <button className="button primary" type="submit" disabled={uploading}>{uploading ? '校验并保存中…' : '校验并登记版本'}</button>
      </form>
      <p className="admin-package-rule">文件名须为 ASRAY_COMPLETE_vX.Y.Z_YYYYMMDD.zip；服务器会重新计算哈希、检查 ZIP 安全性，并拒绝覆盖已有版本。</p>
      {packageNotice && <p className="admin-detail-notice" role="status">{packageNotice}</p>}
      <div className="admin-package-list">
        {packageReleases.length === 0 && <p className="admin-package-empty">尚未登记资料包。可先使用项目内的模拟压缩包进行测试。</p>}
        {packageReleases.map((release) => <article key={release.id}>
          <div><strong>{release.fileName}</strong><span>v{release.version} · {release.releaseDate} · {(release.fileSize / 1024).toFixed(1)} KB</span><code>SHA-256 {release.sha256}</code></div>
          <span className={`admin-status ${release.status === 'ACTIVE' ? 'issued' : 'stopped'}`}>{release.status === 'ACTIVE' ? '有效' : '已归档'}</span>
          {release.status === 'ACTIVE' && <button type="button" onClick={() => void archiveRelease(release)}>归档</button>}
        </article>)}
      </div>
    </section>
    <section className="admin-panel admin-issue-panel">
      <div className="admin-panel-heading"><div><p className="status">新建交付</p><h3>生成客户专属链接</h3></div><span>真实 API</span></div>
      <form className="admin-form" onSubmit={submitDelivery}>
        <div className="admin-form-grid">
          <label className="admin-field">客户编号<input value={customerCode} onChange={(event) => setCustomerCode(event.target.value)} placeholder="例：C001" /></label>
          <label className="admin-field">客户名称<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="例：株式会社サンプル" /></label>
          <div className="admin-field admin-fixed-field"><span>项目名称</span><strong>ASRAY 勤怠・承認管理システム</strong></div>
          <label className="admin-field">资料包版本<select value={packageReleaseId} onChange={(event) => setPackageReleaseId(event.target.value)}><option value="">请选择有效版本</option>{activeReleases.map((release) => <option value={release.id} key={release.id}>v{release.version} / {release.releaseDate}</option>)}</select></label>
          <div className="admin-field admin-fixed-field"><span>水印文本</span><strong>交付编号生成后由服务器固定</strong></div>
          <label className="admin-field">有效期<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
          <label className="admin-field">下载次数<select value={downloadLimit} onChange={(event) => setDownloadLimit(event.target.value)}><option value="1">1 次</option><option value="3">3 次</option><option value="5">5 次</option></select></label>
        </div>
        <div className="admin-form-actions"><p>该记录会固定引用所选母版版本。当前仅生成准备中链接，不会开放真实文件下载。</p><button className="button primary" type="submit" disabled={!packageReleaseId}>生成专属链接</button></div>
      </form>
      {issuedLink && <div className="admin-issued-link" role="status"><p><strong>已生成专属链接</strong><span>请复制后通过 WeChat 发给客户；令牌只在当前操作结果中显示。</span></p><a href={issuedLink}>{issuedLink}</a></div>}
    </section>
    <div className="admin-management">
      <section className="admin-panel admin-list-panel">
        <div className="admin-panel-heading"><div><p className="status">交付记录</p><h3>客户交付一览</h3></div><span>{totalElements} 条</span></div>
        <div className="admin-filters"><label><span>搜索</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="交付编号或客户名称" /></label><label><span>状态</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as DeliveryStatus | ''); setPage(0) }}><option value="">全部</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <div className="admin-table-wrap"><table><thead><tr><th>交付编号 / 客户</th><th>有效期</th><th>下载</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{records.map((record) => <tr className={record.id === selected?.id ? 'selected' : ''} key={record.id}><td><strong>{record.deliveryNo}</strong><span>{record.customerCode} / {record.customerName}</span></td><td>{formatDate(record.expiresAt)}</td><td>{record.downloadCount} / {record.downloadLimit}</td><td><span className={`admin-status ${statusClass(record.status)}`}>{statusLabels[record.status]}</span></td><td><button className="admin-detail-button" onClick={() => { setSelectedId(record.id); setNotice('') }}>详情</button></td></tr>)}</tbody></table></div>
        <div className="admin-mobile-records">{records.map((record) => <button className="admin-mobile-record" key={record.id} onClick={() => { setSelectedId(record.id); setMobileDetailOpen(true) }}><span className={`admin-status ${statusClass(record.status)}`}>{statusLabels[record.status]}</span><strong>{record.customerCode} / {record.customerName}</strong><small>{record.deliveryNo}</small><div><span>有效期：{formatDate(record.expiresAt)}</span><span>下载：{record.downloadCount} / {record.downloadLimit}</span></div></button>)}</div>
        <div className="admin-pagination"><span>{totalElements === 0 ? '0 条' : `${page * 8 + 1}–${Math.min((page + 1) * 8, totalElements)} / 共 ${totalElements} 条`}</span><div><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>上一页</button><span>{page + 1} / {totalPages}</span><button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>下一页</button></div></div>
      </section>
      {selected && <aside className="admin-detail" aria-live="polite"><LiveDeliveryDetails record={selected} events={events} notice={notice} onAction={updateSelected} /></aside>}
    </div>
    {mobileDetailOpen && selected && <div className="mobile-detail-layer"><button className="mobile-detail-backdrop" aria-label="关闭交付详情" onClick={() => setMobileDetailOpen(false)} /><section className="admin-detail mobile-detail-sheet" role="dialog" aria-modal="true" aria-label="交付详情"><div className="mobile-detail-handle" /><button className="mobile-detail-close" onClick={() => setMobileDetailOpen(false)}>关闭</button><LiveDeliveryDetails record={selected} events={events} notice={notice} onAction={updateSelected} /></section></div>}
    <section className="admin-audit"><div><p className="status">系统说明</p><h3>交付与下载记录</h3></div><ol><li><time>当前阶段</time><span>母版 ZIP 校验、不可变版本登记、交付版本固定、认证与审计</span><em>已接通</em></li><li><time>下一阶段</time><span>客户专属 Excel 水印副本、ZIP 生成与一次性下载票据</span><em>待实现</em></li></ol></section>
  </section>

  /* Previous one-line layout retained temporarily until the new layout compiles.

  return <section className="section admin-preview-section"><div className="section-heading"><p className="eyebrow">运营管理</p><h2>交付管理台</h2><p>当前数据来自本机 PostgreSQL。资料文件、水印与真实下载将在最后一个文件交付阶段接入。</p><button className="text-button" type="button" onClick={signOut}>退出管理台 →</button></div><div className="admin-summary"><article><span>交付总数</span><strong>{summary.total}</strong><small>全部记录</small></article><article><span>已发放</span><strong>{summary.issued}</strong><small>客户可领取</small></article><article><span>准备中</span><strong>{summary.preparing}</strong><small>等待资料包</small></article><article><span>已停用</span><strong>{summary.revoked}</strong><small>可重新发放</small></article></div><section className="admin-panel admin-issue-panel"><div className="admin-panel-heading"><div><p className="status">新建交付</p><h3>生成客户专属链接</h3></div><span>真实 API</span></div><form className="admin-form" onSubmit={submitDelivery}><div className="admin-form-grid"><label className="admin-field">客户编号<input value={customerCode} onChange={(event) => setCustomerCode(event.target.value)} placeholder="例：C001" /></label><label className="admin-field">客户名称<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="例：株式会社サンプル" /></label><div className="admin-field admin-fixed-field"><span>项目名称</span><strong>ASRAY 勤怠・承認管理システム</strong></div><label className="admin-field">资料包名称<input value={packageName} onChange={(event) => setPackageName(event.target.value)} /></label><div className="admin-field admin-fixed-field"><span>水印文本</span><strong>交付编号生成后由服务器固定</strong></div><label className="admin-field">有效期<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label><label className="admin-field">下载次数<select value={downloadLimit} onChange={(event) => setDownloadLimit(event.target.value)}><option value="1">1 次</option><option value="3">3 次</option><option value="5">5 次</option></select></label></div><div className="admin-form-actions"><p>生成链接不代表资料已交付。只有最后的文件与水印阶段完成并由服务器切换为“已发放”后，客户才可下载。</p><button className="button primary" type="submit">生成专属链接</button></div></form>{issuedLink && <div className="admin-issued-link" role="status"><p><strong>已生成专属链接</strong><span>请复制后通过 WeChat 发给客户；令牌只在当前操作结果中显示。</span></p><a href={issuedLink}>{issuedLink}</a></div>}</section><div className="admin-management"><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><div><p className="status">交付记录</p><h3>客户交付一览</h3></div><span>{totalElements} 条</span></div><div className="admin-filters"><label><span>搜索</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="交付编号或客户名称" /></label><label><span>状态</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as DeliveryStatus | ''); setPage(0) }}><option value="">全部</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="admin-table-wrap"><table><thead><tr><th>交付编号 / 客户</th><th>有效期</th><th>下载</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{records.map((record) => <tr className={record.id === selected?.id ? 'selected' : ''} key={record.id}><td><strong>{record.deliveryNo}</strong><span>{record.customerCode} / {record.customerName}</span></td><td>{formatDate(record.expiresAt)}</td><td>{record.downloadCount} / {record.downloadLimit}</td><td><span className={`admin-status ${statusClass(record.status)}`}>{statusLabels[record.status]}</span></td><td><button className="admin-detail-button" onClick={() => { setSelectedId(record.id); setNotice('') }}>详情</button></td></tr>)}</tbody></table></div><div className="admin-mobile-records">{records.map((record) => <button className="admin-mobile-record" key={record.id} onClick={() => { setSelectedId(record.id); setMobileDetailOpen(true) }}><span className={`admin-status ${statusClass(record.status)}`}>{statusLabels[record.status]}</span><strong>{record.customerCode} / {record.customerName}</strong><small>{record.deliveryNo}</small><div><span>有效期：{formatDate(record.expiresAt)}</span><span>下载：{record.downloadCount} / {record.downloadLimit}</span></div></button>)}</div><div className="admin-pagination"><span>{totalElements === 0 ? '0 条' : `${page * 8 + 1}–${Math.min((page + 1) * 8, totalElements)} / 共 ${totalElements} 条`}</span><div><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>上一页</button><span>{page + 1} / {totalPages}</span><button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>下一页</button></div></div></section>{selected && <aside className="admin-detail" aria-live="polite"><LiveDeliveryDetails record={selected} events={events} notice={notice} onAction={updateSelected} /></aside>}</div>{mobileDetailOpen && selected && <div className="mobile-detail-layer"><button className="mobile-detail-backdrop" aria-label="关闭交付详情" onClick={() => setMobileDetailOpen(false)} /><section className="admin-detail mobile-detail-sheet" role="dialog" aria-modal="true" aria-label="交付详情"><div className="mobile-detail-handle" /><button className="mobile-detail-close" onClick={() => setMobileDetailOpen(false)}>关闭</button><LiveDeliveryDetails record={selected} events={events} notice={notice} onAction={updateSelected} /></section></div>}<section className="admin-audit"><div><p className="status">系统说明</p><h3>交付与下载记录</h3></div><ol><li><time>当前阶段</time><span>交付创建、会话认证、令牌散列、链接撤销、审计记录</span><em>已接通</em></li><li><time>下一阶段</time><span>私有 ZIP / Excel 水印副本和一次性下载票据</span><em>待实现</em></li></ol></section></section>
}

*/
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
