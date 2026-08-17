import { getAvailableMonthlyActions } from '../data/monthlyActions'
import {
  EXTRA_PAYMENT_CASH_RESERVE_JPY,
  fixedMonthlyExpenses,
  FIXED_MONTHLY_EXPENSES_JPY,
  getMaximumExtraPaymentRmb,
} from '../engine/monthSettlement'
import type { GameStats, Language, MonthlyPlan, VolumeProgress } from '../types/game'
import { formatMoney, statusLabel } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

const extraPaymentOptions = [0, 2_000, 5_000, 10_000] as const

const expenseLabels = {
  rent: { zh: '房租', ja: '家賃' },
  food: { zh: '饮食', ja: '食費' },
  utilities: { zh: '水电', ja: '水道・光熱' },
  telecom: { zh: '通信', ja: '通信' },
  transport_daily: { zh: '交通与日用品', ja: '交通・日用品' },
} as const

function monthLabel(year: number, month: number, language: Language) {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'ja-JP', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, 1))
}

export function MonthlyCyclePage({
  language,
  year,
  month,
  stats,
  progress,
  flags,
  plan,
  onPerformAction,
  onSetExtraPayment,
  onComplete,
}: {
  language: Language
  year: number
  month: number
  stats: GameStats
  progress: VolumeProgress
  flags: string[]
  plan: MonthlyPlan
  onPerformAction: (actionId: string) => void
  onSetExtraPayment: (amountRmb: number) => void
  onComplete: () => void
}) {
  const actions = getAvailableMonthlyActions({
    elapsedMonth: progress.elapsedMonths,
    stats,
    flags,
  })
  const maximumExtraPaymentRmb = getMaximumExtraPaymentRmb(stats, plan)
  const rateJpyPerRmb = plan.exchangeRate > 0 ? 1 / plan.exchangeRate : 0

  return <section className={styles.monthCyclePage}>
    <header className={styles.monthCycleHeader}>
      <div>
        <p className={styles.kicker}>{language === 'zh' ? `第一卷 · 第${progress.elapsedMonths}月` : `第一巻 · ${progress.elapsedMonths}か月目`}</p>
        <h1>{monthLabel(year, month, language)}</h1>
      </div>
      <div className={styles.actionPointSeal} aria-label={language === 'zh' ? '本月剩余行动点' : '今月の残り行動点'}>
        <span>AP</span>
        <strong>{plan.actionPointsRemaining}</strong>
        <small>/ {plan.actionPointsGranted}</small>
      </div>
    </header>

    <dl className={styles.monthCycleLedger}>
      <div><dt>{language === 'zh' ? '人民币负债' : '人民元建て負債'}</dt><dd>{formatMoney(stats.debtRmb, 'RMB', language)}</dd></div>
      <div><dt>{language === 'zh' ? '日元现金' : '円現金'}</dt><dd>{formatMoney(stats.cashJpy, 'JPY', language)}</dd></div>
      <div><dt>{language === 'zh' ? '本月工资' : '今月給与'}</dt><dd>{formatMoney(stats.salaryJpy, 'JPY', language)}</dd></div>
      <div><dt>{language === 'zh' ? '固定支出' : '固定支出'}</dt><dd>{formatMoney(FIXED_MONTHLY_EXPENSES_JPY, 'JPY', language)}</dd></div>
      <div><dt>{language === 'zh' ? '身体' : '身体'}</dt><dd>{statusLabel('health', stats.health, language)}</dd></div>
      <div><dt>{language === 'zh' ? '精神' : '精神'}</dt><dd>{statusLabel('mental', stats.mental, language)}</dd></div>
    </dl>

    <div className={styles.monthOperatingGrid}>
      <section className={styles.monthPanel}>
        <div className={styles.monthPanelHeading}>
          <div>
            <span>01</span>
            <h2>{language === 'zh' ? '自由行动' : '自由行動'}</h2>
          </div>
          <small>{language === 'zh' ? '行动一经选择不可撤回' : '選んだ行動は取り消せない'}</small>
        </div>
        <div className={styles.monthActionList}>
          {actions.map((action) => <button
            type="button"
            key={action.id}
            disabled={action.actionPointCost > plan.actionPointsRemaining}
            onClick={() => onPerformAction(action.id)}
          >
            <span>{action.label[language]}</span>
            <small>{action.description[language]}</small>
            <b>−{action.actionPointCost} AP</b>
          </button>)}
        </div>
        {plan.selectedActions.length > 0 && <ol className={styles.selectedActionList}>
          {plan.selectedActions.map((action, index) => <li key={`${action.actionId}-${index}`}>
            <span>{action.label[language]}</span>
            <small>−{action.actionPointCost} AP</small>
          </li>)}
        </ol>}
      </section>

      <section className={styles.monthPanel}>
        <div className={styles.monthPanelHeading}>
          <div>
            <span>02</span>
            <h2>{language === 'zh' ? '本月账目' : '今月の帳簿'}</h2>
          </div>
          <small>1 RMB ≈ {rateJpyPerRmb.toFixed(2)} JPY</small>
        </div>
        <ul className={styles.fixedExpenseList}>
          {fixedMonthlyExpenses.map((expense) => <li key={expense.id}>
            <span>{expenseLabels[expense.id][language]}</span>
            <strong>{formatMoney(expense.amountJpy, 'JPY', language)}</strong>
          </li>)}
        </ul>
        <div className={styles.extraPaymentBlock}>
          <h3>{language === 'zh' ? '额外还款' : '追加返済'}</h3>
          <p>{language === 'zh'
            ? `最低还款另行结算。额外还款后至少保留 ${formatMoney(EXTRA_PAYMENT_CASH_RESERVE_JPY, 'JPY', language)}。`
            : `最低返済は別途精算。追加返済後は最低 ${formatMoney(EXTRA_PAYMENT_CASH_RESERVE_JPY, 'JPY', language)} を残す。`}</p>
          <div className={styles.extraPaymentOptions}>
            {extraPaymentOptions.map((amount) => <button
              type="button"
              key={amount}
              aria-pressed={plan.extraPaymentRmb === amount}
              disabled={amount > maximumExtraPaymentRmb}
              onClick={() => onSetExtraPayment(amount)}
            >{amount === 0
                ? (language === 'zh' ? '本月不追加' : '今月は追加なし')
                : formatMoney(amount, 'RMB', language)}</button>)}
          </div>
          <small>{language === 'zh'
            ? `本月最多可追加 ${formatMoney(maximumExtraPaymentRmb, 'RMB', language)}`
            : `今月の追加上限 ${formatMoney(maximumExtraPaymentRmb, 'RMB', language)}`}</small>
        </div>
      </section>
    </div>

    <div className={styles.monthClosingBar}>
      <small>{language === 'zh'
        ? `月利率 ${(stats.debtInterestRate * 100).toFixed(1)}% · 本月汇率已固定，刷新不会重抽`
        : `月利率 ${(stats.debtInterestRate * 100).toFixed(1)}%・今月の為替は確定済み`}</small>
      <button className={styles.primaryButton} type="button" onClick={onComplete}>{language === 'zh' ? '确认并进行月结' : '確認して月次精算へ'}</button>
    </div>
  </section>
}
