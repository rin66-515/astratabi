import type { GameStats, Language } from '../types/game'
import { statusLabel } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

export function MonthIntroPage({ language, stats, onEnter }: { language: Language; stats: GameStats; onEnter: () => void }) {
  return <section className={styles.monthIntro}>
    <p className={styles.kicker}>{language === 'zh' ? '第一卷 · 极东' : '第一巻 · 極東'}</p>
    <h1>{language === 'zh' ? '八月｜初至' : '八月｜初来'}</h1>
    <p>{language === 'zh' ? '第一次工资到账以前，时间和现金都比想象中薄。' : '最初の給与が入るまで、時間も現金も思ったより薄い。'}</p>
    <dl className={styles.monthLedger}>
      <div><dt>{language === 'zh' ? '本月行动点' : '今月の行動点'}</dt><dd>{stats.actionPoints}</dd></div>
      <div><dt>{language === 'zh' ? '身体' : '身体'}</dt><dd>{statusLabel('health', stats.health, language)}</dd></div>
      <div><dt>{language === 'zh' ? '精神' : '精神'}</dt><dd>{statusLabel('mental', stats.mental, language)}</dd></div>
    </dl>
    <button className={styles.primaryButton} type="button" onClick={onEnter}>{language === 'zh' ? '入月' : '月へ入る'}</button>
  </section>
}
