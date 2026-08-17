import { firstMonthEventMap } from '../data/events/firstMonth'
import { initialGameStats } from '../data/initialState'
import type { ChoiceHistoryEntry, GameStats, Language } from '../types/game'
import { localize } from '../utils/localize'
import { formatMoney, skillLabel, statusLabel } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

function signed(value: number) {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value)}`
}

function sideJobLabel(stats: GameStats, flags: string[], language: Language) {
  if (stats.product >= 45 || flags.includes('sidejob_established') || flags.includes('product_released')) {
    return language === 'zh' ? '另一条路已出现轮廓' : 'もう一つの道が輪郭を持ち始めた'
  }
  if (stats.product >= 20) return language === 'zh' ? '仍在摸索' : 'まだ模索中'
  return language === 'zh' ? '尚未展开' : 'まだ始まっていない'
}

export function AnnualReportPage({ language, stats, flags, history, onContinue }: {
  language: Language
  stats: GameStats
  flags: string[]
  history: ChoiceHistoryEntry[]
  onContinue: () => void
}) {
  const important = history.slice(0, 6).flatMap((entry) => {
    const event = firstMonthEventMap.get(entry.eventId)
    const option = event?.options.find((candidate) => candidate.id === entry.optionId)
    return event && option ? [{ event, option, entry }] : []
  })

  return <section className={styles.reportPage}>
    <header><p className={styles.kicker}>{language === 'zh' ? '第一卷 · 极东' : '第一巻 · 極東'}</p><h1>{language === 'zh' ? '第一年度报告' : '第一年度報告'}</h1><p>{language === 'zh' ? '这不是结局。只是走到这里，回头看一眼。' : 'これは結末ではない。ここまで歩き、一度振り返るだけだ。'}</p></header>
    <div className={styles.reportGrid}>
      <dl>
        <div><dt>{language === 'zh' ? '人民币负债' : '人民元建て負債'}</dt><dd>{formatMoney(stats.debtRmb, 'RMB', language)}</dd></div>
        <div><dt>{language === 'zh' ? '日元现金' : '円現金'}</dt><dd>{formatMoney(stats.cashJpy, 'JPY', language)}</dd></div>
        <div><dt>{language === 'zh' ? '当前工资' : '現在の給与'}</dt><dd>{formatMoney(stats.salaryJpy, 'JPY', language)}<small>{language === 'zh' ? '变化' : '変化'} {signed(stats.salaryJpy - initialGameStats.salaryJpy)}</small></dd></div>
        <div><dt>{language === 'zh' ? '身体' : '身体'}</dt><dd>{statusLabel('health', stats.health, language)}</dd></div>
        <div><dt>{language === 'zh' ? '精神' : '精神'}</dt><dd>{statusLabel('mental', stats.mental, language)}</dd></div>
        <div><dt>{language === 'zh' ? '社交' : '対人'}</dt><dd>{statusLabel('socialBattery', stats.socialBattery, language)}</dd></div>
        <div><dt>{language === 'zh' ? '自由' : '自由'}</dt><dd>{statusLabel('freedom', stats.freedom, language)}</dd></div>
      </dl>
      <dl>
        {(['tech', 'workplace', 'product'] as const).map((key) => <div key={key}><dt>{{ tech: language === 'zh' ? '技术' : '技術', workplace: language === 'zh' ? '职场' : '職場', product: language === 'zh' ? '产品' : 'プロダクト' }[key]}</dt><dd>{skillLabel(stats[key], language)}<small>{signed(stats[key] - initialGameStats[key])}</small></dd></div>)}
        <div><dt>{language === 'zh' ? '副业状态' : '副業状態'}</dt><dd>{sideJobLabel(stats, flags, language)}</dd></div>
      </dl>
    </div>
    <section className={styles.reportChoices}>
      <h2>{language === 'zh' ? '这一年留下的事件与选择' : 'この一年に残った出来事と選択'}</h2>
      {important.length > 0 ? <ol>{important.map(({ event, option, entry }) => <li key={`${entry.eventId}-${entry.chosenAt}`}><span>{localize(event.title, language)}</span><strong>{localize(option.label, language)}</strong></li>)}</ol> : <p>{language === 'zh' ? '尚无可记录的选择。' : '記録できる選択はまだない。'}</p>}
    </section>
    <button className={styles.primaryButton} type="button" onClick={onContinue}>{language === 'zh' ? '进入第十三个月' : '十三か月目へ進む'}</button>
  </section>
}
