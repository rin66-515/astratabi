import { firstMonthEventMap } from '../data/events/firstMonth'
import { initialGameStats } from '../data/initialState'
import type { ChoiceHistoryEntry, GameStats, Language } from '../types/game'
import { localize } from '../utils/localize'
import { formatMoney, statusLabel } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

function signedMoney(value: number, currency: 'JPY' | 'RMB', language: Language) {
  const amount = formatMoney(Math.abs(value), currency, language)
  return `${value >= 0 ? '+' : '−'}${amount}`
}

export function MonthSummaryPage({ language, stats, history, onNext }: { language: Language; stats: GameStats; history: ChoiceHistoryEntry[]; onNext: () => void }) {
  const choices = history.filter((entry) => !entry.eventId.startsWith('main-00') && !entry.eventId.startsWith('main-09')).slice(-5)
  return <section className={styles.summaryPage}>
    <div className={styles.summaryHeading}><p className={styles.kicker}>{language === 'zh' ? '八月账簿' : '八月の帳簿'}</p><h1>{language === 'zh' ? '你活到了第一次工资之前。' : '最初の給与を前に、ここまで生きた。'}</h1></div>
    <div className={styles.summaryGrid}>
      <dl className={styles.summaryLedger}>
        <div><dt>{language === 'zh' ? '月末现金' : '月末現金'}</dt><dd>{formatMoney(stats.cashJpy, 'JPY', language)}<small>{signedMoney(stats.cashJpy - initialGameStats.cashJpy, 'JPY', language)}</small></dd></div>
        <div><dt>{language === 'zh' ? '人民币负债' : '人民元建て負債'}</dt><dd>{formatMoney(stats.debtRmb, 'RMB', language)}<small>{signedMoney(stats.debtRmb - initialGameStats.debtRmb, 'RMB', language)}</small></dd></div>
        <div><dt>{language === 'zh' ? '身体' : '身体'}</dt><dd>{statusLabel('health', stats.health, language)}</dd></div>
        <div><dt>{language === 'zh' ? '精神' : '精神'}</dt><dd>{statusLabel('mental', stats.mental, language)}</dd></div>
        <div><dt>{language === 'zh' ? '社交' : '対人電池'}</dt><dd>{statusLabel('socialBattery', stats.socialBattery, language)}</dd></div>
        <div><dt>{language === 'zh' ? '剩余行动点' : '残り行動点'}</dt><dd>{stats.actionPoints}</dd></div>
      </dl>
      <div className={styles.choiceLedger}>
        <h2>{language === 'zh' ? '留下来的选择' : '残った選択'}</h2>
        <ol>{choices.map((entry) => {
          const event = firstMonthEventMap.get(entry.eventId)
          const option = event?.options.find((candidate) => candidate.id === entry.optionId)
          if (!event || !option) return null
          return <li key={`${entry.eventId}-${entry.chosenAt}`}><span>{localize(event.title, language)}</span><strong>{localize(option.label, language)}</strong></li>
        })}</ol>
      </div>
    </div>
    <blockquote>{language === 'zh' ? '东京没有欢迎你。这个月也没有。但你已经在这里留下了一点自己的痕迹。' : '東京は歓迎してくれなかった。この月もそうだった。それでも、自分の跡を少しだけ残した。'}</blockquote>
    <button className={styles.primaryButton} type="button" onClick={onNext}>{language === 'zh' ? '看看九月' : '九月を見る'}</button>
  </section>
}
