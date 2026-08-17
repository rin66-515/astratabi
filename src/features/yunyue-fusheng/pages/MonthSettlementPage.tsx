import type { Language, MonthSettlement } from '../types/game'
import { formatMoney } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

const expenseLabels = {
  rent: { zh: '房租', ja: '家賃' },
  food: { zh: '饮食', ja: '食費' },
  utilities: { zh: '水电', ja: '水道・光熱' },
  telecom: { zh: '通信', ja: '通信' },
  transport_daily: { zh: '交通与日用品', ja: '交通・日用品' },
} as const

export function MonthSettlementPage({ language, settlement, onContinue }: {
  language: Language
  settlement: MonthSettlement
  onContinue: () => void
}) {
  return <section className={styles.monthSettlementPage}>
    <header>
      <p className={styles.kicker}>{language === 'zh' ? `第${settlement.elapsedMonth}月 · 月结` : `${settlement.elapsedMonth}か月目・月次精算`}</p>
      <h1>{language === 'zh' ? '这个月，账合上了。' : '今月の帳簿を閉じた。'}</h1>
      <p>{settlement.year}.{String(settlement.month).padStart(2, '0')} · 1 RMB ≈ {(1 / settlement.exchangeRate).toFixed(2)} JPY</p>
    </header>

    <div className={styles.settlementGrid}>
      <section>
        <h2>{language === 'zh' ? '日元收支' : '円収支'}</h2>
        <dl>
          <div><dt>{language === 'zh' ? '月初现金' : '月初現金'}</dt><dd>{formatMoney(settlement.cashJpyBefore, 'JPY', language)}</dd></div>
          <div><dt>{language === 'zh' ? '工资到账' : '給与入金'}</dt><dd className={styles.positiveAmount}>+{formatMoney(settlement.salaryJpy, 'JPY', language)}</dd></div>
          {settlement.fixedExpenses.map((expense) => <div key={expense.id}><dt>{expenseLabels[expense.id][language]}</dt><dd>−{formatMoney(expense.amountJpy, 'JPY', language)}</dd></div>)}
          <div><dt>{language === 'zh' ? '还款换汇' : '返済用両替'}</dt><dd>−{formatMoney(settlement.paymentJpy, 'JPY', language)}</dd></div>
          <div className={styles.settlementTotal}><dt>{language === 'zh' ? '月末现金' : '月末現金'}</dt><dd>{formatMoney(settlement.cashJpyAfter, 'JPY', language)}</dd></div>
        </dl>
      </section>

      <section>
        <h2>{language === 'zh' ? '人民币负债' : '人民元建て負債'}</h2>
        <dl>
          <div><dt>{language === 'zh' ? '月初负债' : '月初負債'}</dt><dd>{formatMoney(settlement.debtRmbBefore, 'RMB', language)}</dd></div>
          <div><dt>{language === 'zh' ? '本月利息' : '今月利息'}</dt><dd>+{formatMoney(settlement.interestRmb, 'RMB', language)}</dd></div>
          <div><dt>{language === 'zh' ? '最低还款' : '最低返済'}</dt><dd className={styles.positiveAmount}>−{formatMoney(settlement.minimumPaymentRmb, 'RMB', language)}</dd></div>
          <div><dt>{language === 'zh' ? '额外还款' : '追加返済'}</dt><dd className={styles.positiveAmount}>−{formatMoney(settlement.extraPaymentRmb, 'RMB', language)}</dd></div>
          <div className={styles.settlementTotal}><dt>{language === 'zh' ? '月末负债' : '月末負債'}</dt><dd>{formatMoney(settlement.debtRmbAfter, 'RMB', language)}</dd></div>
        </dl>
      </section>
    </div>

    <section className={styles.settlementActions}>
      <h2>{language === 'zh' ? '本月自由行动' : '今月の自由行動'}</h2>
      <p>{language === 'zh'
        ? `使用 ${settlement.actionPointsSpent} / ${settlement.actionPointsGranted} AP`
        : `${settlement.actionPointsSpent} / ${settlement.actionPointsGranted} AP 使用`}</p>
      {settlement.actions.length > 0
        ? <ul>{settlement.actions.map((action, index) => <li key={`${action.actionId}-${index}`}>{action.label[language]}</li>)}</ul>
        : <small>{language === 'zh' ? '这个月没有安排额外行动。' : '今月は自由行動を選ばなかった。'}</small>}
    </section>

    <button className={styles.primaryButton} type="button" onClick={onContinue}>{language === 'zh' ? '收好账簿' : '帳簿をしまう'}</button>
  </section>
}
