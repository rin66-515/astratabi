import { stagePolicyContent, timePassageCauseContent } from '../data/timePassage'
import type { Language, TimePassageState } from '../types/game'
import { formatMoney, statusLabel } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

function calendarLabel(year: number, month: number, language: Language) {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'ja-JP', {
    year: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, 1))
}

function stressLabel(value: number, language: Language) {
  if (value >= 80) return language === 'zh' ? '接近极限' : '限界に近い'
  if (value >= 60) return language === 'zh' ? '很高' : 'かなり高い'
  if (value >= 40) return language === 'zh' ? '偏高' : 'やや高い'
  if (value >= 20) return language === 'zh' ? '尚可' : 'まずまず'
  return language === 'zh' ? '平稳' : '穏やか'
}

export function TimePassagePage({ language, passage, onContinue }: {
  language: Language
  passage: TimePassageState
  onContinue: () => void
}) {
  const cause = timePassageCauseContent[passage.causeId]
  const policy = stagePolicyContent[passage.policy]
  return <section className={styles.timePassagePage}>
    <header>
      <p className={styles.kicker}>{language === 'zh' ? '时间流逝' : '時が流れた'}</p>
      <h1>{language === 'zh'
        ? `再抬起头，已经过去 ${passage.skippedMonths} 个月。`
        : `顔を上げると、もう ${passage.skippedMonths} か月が過ぎていた。`}</h1>
    </header>

    <article className={styles.timePassageStory}>
      <small>{language === 'zh' ? '这一程发生了什么' : 'この間に起きたこと'}</small>
      <h2>《{cause.title[language]}》</h2>
      {cause.lines.map((line, index) => <p key={`${passage.causeId}-${index}`}>{line[language]}</p>)}
      <footer><span>{language === 'zh' ? '原定方针' : '選んでいた方針'}</span><strong>{policy.label[language]}</strong></footer>
    </article>

    <dl className={styles.timePassageLedger}>
      <div><dt>{language === 'zh' ? '人民币负债' : '人民元建て負債'}</dt><dd>{formatMoney(passage.statsBefore.debtRmb, 'RMB', language)} → {formatMoney(passage.statsAfter.debtRmb, 'RMB', language)}</dd></div>
      <div><dt>{language === 'zh' ? '日元现金' : '円現金'}</dt><dd>{formatMoney(passage.statsBefore.cashJpy, 'JPY', language)} → {formatMoney(passage.statsAfter.cashJpy, 'JPY', language)}</dd></div>
      <div><dt>{language === 'zh' ? '身体' : '身体'}</dt><dd>{statusLabel('health', passage.statsAfter.health, language)}</dd></div>
      <div><dt>{language === 'zh' ? '精神' : '精神'}</dt><dd>{statusLabel('mental', passage.statsAfter.mental, language)}</dd></div>
      <div><dt>{language === 'zh' ? '压力' : 'ストレス'}</dt><dd>{stressLabel(passage.statsAfter.stress, language)}</dd></div>
    </dl>

    <details className={styles.timePassageDetails}>
      <summary>{language === 'zh' ? '看看这些月份留下的账' : 'この月々の記録を見る'}</summary>
      <ol>{passage.months.map((month) => <li key={month.elapsedMonth}>
        <div><strong>{calendarLabel(month.year, month.month, language)}</strong><small>{language === 'zh' ? `第${month.elapsedMonth}月` : `${month.elapsedMonth}か月目`}</small></div>
        <p>{month.actions.length > 0
          ? month.actions.map((action) => action[language]).join('、')
          : (language === 'zh' ? '除了生活与工作，没有再安排别的事。' : '暮らしと仕事以外は、何も予定しなかった。')}</p>
        <span>{formatMoney(month.debtRmbAfter, 'RMB', language)}</span>
      </li>)}</ol>
    </details>

    <button className={styles.primaryButton} type="button" onClick={onContinue}>{language === 'zh' ? '看看后来' : 'その先を見る'}</button>
  </section>
}
