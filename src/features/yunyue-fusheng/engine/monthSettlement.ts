import type {
  FixedExpenseItem,
  GameStats,
  MonthSettlement,
  MonthlyPlan,
} from '../types/game'
import { applyEffects } from './applyEffects'
import { resolveMonthlyConsequence } from './recoveryResolver'

export const EXTRA_PAYMENT_CASH_RESERVE_JPY = 50_000

export const fixedMonthlyExpenses: readonly FixedExpenseItem[] = [
  { id: 'rent', amountJpy: 75_000 },
  { id: 'food', amountJpy: 42_000 },
  { id: 'utilities', amountJpy: 13_000 },
  { id: 'telecom', amountJpy: 7_000 },
  { id: 'transport_daily', amountJpy: 13_000 },
]

export const FIXED_MONTHLY_EXPENSES_JPY = fixedMonthlyExpenses.reduce(
  (total, expense) => total + expense.amountJpy,
  0,
)

export type MonthSettlementContext = {
  elapsedMonth: number
  year: number
  month: number
}

export type MonthSettlementResult = {
  stats: GameStats
  settlement: MonthSettlement
}

type BaseSettlement = {
  interestRmb: number
  debtAfterInterest: number
  cashAfterExpenses: number
  minimumPaymentRmb: number
  minimumPaymentJpy: number
  cashAfterMinimumPayment: number
  debtAfterMinimumPayment: number
}

function calculateBaseSettlement(stats: GameStats, exchangeRate: number): BaseSettlement {
  const interestRmb = Math.ceil(stats.debtRmb * stats.debtInterestRate)
  const debtAfterInterest = stats.debtRmb + interestRmb
  const cashAfterSalary = Math.max(0, stats.cashJpy + stats.salaryJpy)
  const cashAfterExpenses = Math.max(0, cashAfterSalary - FIXED_MONTHLY_EXPENSES_JPY)
  const affordableRmb = exchangeRate > 0 ? Math.floor(cashAfterExpenses * exchangeRate) : 0
  const minimumPaymentRmb = Math.min(stats.minimumPaymentRmb, debtAfterInterest, affordableRmb)
  const minimumPaymentJpy = exchangeRate > 0
    ? Math.min(cashAfterExpenses, Math.ceil(minimumPaymentRmb / exchangeRate))
    : 0

  return {
    interestRmb,
    debtAfterInterest,
    cashAfterExpenses,
    minimumPaymentRmb,
    minimumPaymentJpy,
    cashAfterMinimumPayment: Math.max(0, cashAfterExpenses - minimumPaymentJpy),
    debtAfterMinimumPayment: Math.max(0, debtAfterInterest - minimumPaymentRmb),
  }
}

export function getMaximumExtraPaymentRmb(stats: GameStats, plan: MonthlyPlan): number {
  const base = calculateBaseSettlement(stats, plan.exchangeRate)
  const availableJpy = Math.max(
    0,
    base.cashAfterMinimumPayment - EXTRA_PAYMENT_CASH_RESERVE_JPY,
  )
  const affordableRmb = plan.exchangeRate > 0 ? Math.floor(availableJpy * plan.exchangeRate) : 0
  return Math.min(base.debtAfterMinimumPayment, affordableRmb)
}

export function settleMonth(
  stats: GameStats,
  context: MonthSettlementContext,
  plan: MonthlyPlan,
): MonthSettlementResult {
  const base = calculateBaseSettlement(stats, plan.exchangeRate)
  const maximumExtraPaymentRmb = getMaximumExtraPaymentRmb(stats, plan)
  const extraPaymentRmb = Math.min(
    Math.max(0, Math.floor(plan.extraPaymentRmb)),
    maximumExtraPaymentRmb,
  )
  const extraPaymentJpy = plan.exchangeRate > 0
    ? Math.min(base.cashAfterMinimumPayment, Math.ceil(extraPaymentRmb / plan.exchangeRate))
    : 0
  const paymentRmb = base.minimumPaymentRmb + extraPaymentRmb
  const paymentJpy = base.minimumPaymentJpy + extraPaymentJpy
  const cashJpyAfter = Math.max(0, base.cashAfterMinimumPayment - extraPaymentJpy)
  const debtRmbAfter = Math.max(0, base.debtAfterMinimumPayment - extraPaymentRmb)
  const sideHustleIncomeJpy = plan.selectedActions.reduce(
    (total, action) => total + (action.sideHustle?.incomeJpy ?? 0),
    0,
  )
  const consequence = resolveMonthlyConsequence(
    plan.actionPointsGranted,
    plan.actionPointsRemaining,
  )
  const settledStats = applyEffects({
    ...stats,
    cashJpy: cashJpyAfter,
    debtRmb: debtRmbAfter,
    exchangeRate: plan.exchangeRate,
    actionPoints: plan.actionPointsRemaining,
  }, consequence.effects)

  return {
    stats: settledStats,
    settlement: {
      elapsedMonth: context.elapsedMonth,
      year: context.year,
      month: context.month,
      cashJpyBefore: plan.openingCashJpy,
      debtRmbBefore: stats.debtRmb,
      actionPointsGranted: plan.actionPointsGranted,
      actionPointsSpent: consequence.actionPointsSpent,
      actionPointsOverdrawn: consequence.actionPointsOverdrawn,
      actionIntensity: consequence.actionIntensity,
      negativeActionPointMonth: consequence.negativeActionPointMonth,
      consequenceEffects: { ...consequence.effects },
      exchangeRate: plan.exchangeRate,
      salaryJpy: stats.salaryJpy,
      sideHustleIncomeJpy,
      fixedExpenses: fixedMonthlyExpenses.map((expense) => ({ ...expense })),
      fixedExpensesJpy: FIXED_MONTHLY_EXPENSES_JPY,
      interestRmb: base.interestRmb,
      minimumPaymentRmb: base.minimumPaymentRmb,
      extraPaymentRmb,
      paymentRmb,
      paymentJpy,
      cashJpyAfter,
      debtRmbAfter,
      actions: plan.selectedActions.map((action) => ({
        ...action,
        effects: { ...action.effects },
      })),
    },
  }
}
