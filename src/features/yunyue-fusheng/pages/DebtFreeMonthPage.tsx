import type { GameStats, Language } from '../types/game'
import { formatMoney } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

const choices = [
  { id: 'save', zh: '先存下来', ja: 'まず貯めておく' },
  { id: 'travel', zh: '去一个不远的地方', ja: '少しだけ遠くへ行く' },
  { id: 'small_luxury', zh: '买一件以前舍不得买的小东西', ja: '以前はためらった小さな物を買う' },
  { id: 'rest', zh: '什么都不做，好好休息', ja: '何もせず、きちんと休む' },
] as const

export function DebtFreeMonthPage({ language, stats, onChoose }: { language: Language; stats: GameStats; onChoose: (optionId: string) => void }) {
  return <section className={styles.debtFreePage}>
    <p className={styles.kicker}>{language === 'zh' ? '无债月' : '無債務の月'}</p>
    <h1>{language === 'zh' ? '工资第一次属于现在。' : '給与が初めて、今の自分のものになった。'}</h1>
    <p>{language === 'zh' ? '这个月，不需要再为过去准备最低还款。' : '今月は、過去のために最低返済額を用意しなくていい。'}</p>
    <strong>{formatMoney(stats.cashJpy, 'JPY', language)}</strong>
    <div className={styles.optionList}>{choices.map((choice, index) => <button type="button" onClick={() => onChoose(choice.id)} key={choice.id}><span>{String.fromCharCode(65 + index)}</span>{choice[language]}</button>)}</div>
  </section>
}
