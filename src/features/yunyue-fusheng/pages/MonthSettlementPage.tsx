import type { Language, MonthSettlement } from '../types/game'
import { formatMoney } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

const expenseLabels = {
  rent: { zh: '房租', ja: '家賃' },
  food: { zh: '饮食', ja: '食費' },
  utilities: { zh: '水电', ja: '水道・光熱' },
  telecom: { zh: '通信', ja: '通信' },
  transport: { zh: '交通', ja: '交通' },
  smoking: { zh: '烟草', ja: 'たばこ' },
  other_basic: { zh: '其他基本支出', ja: 'その他基本支出' },
} as const

export function MonthSettlementPage({ language, settlement, onContinue }: {
  language: Language
  settlement: MonthSettlement
  onContinue: () => void
}) {
  const monthlyDebtReduction = Math.max(
    1,
    settlement.minimumPaymentRmb + settlement.extraPaymentRmb - settlement.interestRmb,
  )
  const projectedMonths = Math.ceil(settlement.debtRmbAfter / monthlyDebtReduction)
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
          <div><dt>{language === 'zh' ? '副业收入' : '副業収入'}</dt><dd className={styles.positiveAmount}>+{formatMoney(settlement.sideHustleIncomeJpy, 'JPY', language)}</dd></div>
          <div><dt>{language === 'zh' ? '工资到账' : '給与入金'}</dt><dd className={styles.positiveAmount}>+{formatMoney(settlement.salaryJpy, 'JPY', language)}</dd></div>
          <div><dt>{language === 'zh' ? '生活支出' : '生活支出'}</dt><dd>−{formatMoney(settlement.fixedExpensesJpy, 'JPY', language)}</dd></div>
          <div><dt>{language === 'zh' ? '还款换汇' : '返済用両替'}</dt><dd>−{formatMoney(settlement.paymentJpy, 'JPY', language)}</dd></div>
          <div className={styles.settlementTotal}><dt>{language === 'zh' ? '月末现金' : '月末現金'}</dt><dd>{formatMoney(settlement.cashJpyAfter, 'JPY', language)}</dd></div>
        </dl>
        <details className={styles.settlementDetails}>
          <summary>{language === 'zh' ? '查看工资与生活支出明细' : '給与・生活支出の内訳を見る'}</summary>
          <dl>
            <div><dt>{language === 'zh' ? '基础工资' : '基本給'}</dt><dd>+{formatMoney(settlement.income.baseSalaryJpy, 'JPY', language)}</dd></div>
            <div><dt>{language === 'zh' ? '职责津贴' : '役割手当'}</dt><dd>+{formatMoney(settlement.income.roleAllowanceJpy, 'JPY', language)}</dd></div>
            <div><dt>{language === 'zh' ? '带新人津贴' : '指導手当'}</dt><dd>+{formatMoney(settlement.income.mentorAllowanceJpy, 'JPY', language)}</dd></div>
            <div><dt>{language === 'zh' ? '加班及其他收入' : '残業・その他収入'}</dt><dd>+{formatMoney(settlement.income.overtimeIncomeJpy, 'JPY', language)}</dd></div>
            {settlement.fixedExpenses.map((expense) => <div key={expense.id}><dt>{expenseLabels[expense.id][language]}</dt><dd>−{formatMoney(expense.amountJpy, 'JPY', language)}</dd></div>)}
          </dl>
        </details>
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

    {settlement.elapsedMonth === 2 && settlement.debtRmbAfter > 0 && <section className={styles.debtProjection}>
      <small>{language === 'zh' ? '【观测者】' : '【観測者】'}</small>
      <p>{language === 'zh'
        ? `按照这个月的还款速度，预计仍需约 ${projectedMonths} 个月完成清债。`
        : `今月の返済ペースでは、完済まであと約 ${projectedMonths} か月を要する。`}</p>
      <strong>……</strong>
    </section>}

    <section className={styles.settlementActions}>
      <h2>{language === 'zh' ? '本月自由行动' : '今月の自由行動'}</h2>
      <p>{language === 'zh'
        ? `使用 ${settlement.actionPointsSpent} / ${settlement.actionPointsGranted} AP`
        : `${settlement.actionPointsSpent} / ${settlement.actionPointsGranted} AP 使用`}</p>
      {settlement.negativeActionPointMonth
        ? <p>{language === 'zh'
          ? `本月透支 ${settlement.actionPointsOverdrawn} AP。压力与恢复债已在本次月结中落账。`
          : `今月は ${settlement.actionPointsOverdrawn} AP を前借りした。ストレスと回復負債は今回の精算に反映済み。`}</p>
        : <p>{language === 'zh'
          ? `行动强度 ${Math.round(settlement.actionIntensity * 100)}%。未透支的余量会影响下月恢复。`
          : `行動強度 ${Math.round(settlement.actionIntensity * 100)}%。余力は翌月の回復に影響する。`}</p>}
      {settlement.actions.length > 0
        ? <ul>{settlement.actions.map((action, index) => <li key={`${action.actionId}-${index}`}>{action.label[language]}</li>)}</ul>
        : <small>{language === 'zh' ? '这个月没有安排额外行动。' : '今月は自由行動を選ばなかった。'}</small>}
    </section>

    <button className={styles.primaryButton} type="button" onClick={onContinue}>{language === 'zh' ? '收好账簿' : '帳簿をしまう'}</button>
  </section>
}
