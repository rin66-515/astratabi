import type {
  GameStats,
  LivingProfile,
  MonthSettlement,
  MonthlyPlan,
} from '../types/game'
import { applyEffects } from './applyEffects'
import { advanceLivingProfile, livingEffects, resolveLivingExpenses } from './livingCostResolver'
import { resolveMonthlyConsequence } from './recoveryResolver'

export const EXTRA_PAYMENT_CASH_RESERVE_JPY = 50_000

export type MonthSettlementContext = {
  elapsedMonth: number
  year: number
  month: number
}

export type MonthSettlementResult = {
  stats: GameStats
  livingProfile: LivingProfile
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

function calculateBaseSettlement(stats: GameStats, plan: MonthlyPlan): BaseSettlement {
  const fixedExpensesJpy = resolveLivingExpenses(
    plan.foodLifestyle,
    plan.smokingLevel,
    plan.extraSmokingJpy,
  ).reduce((total, expense) => total + expense.amountJpy, 0)
  const interestRmb = Math.ceil(stats.debtRmb * stats.debtInterestRate)
  const debtAfterInterest = stats.debtRmb + interestRmb
  const cashAfterSalary = Math.max(0, stats.cashJpy + plan.income.totalIncomeJpy)
  const cashAfterExpenses = Math.max(0, cashAfterSalary - fixedExpensesJpy)
  const affordableRmb = plan.exchangeRate > 0 ? Math.floor(cashAfterExpenses * plan.exchangeRate) : 0
  const minimumPaymentRmb = Math.min(stats.minimumPaymentRmb, debtAfterInterest, affordableRmb)
  const minimumPaymentJpy = plan.exchangeRate > 0
    ? Math.min(cashAfterExpenses, Math.ceil(minimumPaymentRmb / plan.exchangeRate))
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
  const base = calculateBaseSettlement(stats, plan)
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
  currentLivingProfile: LivingProfile = {
    foodLifestyle: plan.foodLifestyle,
    consecutiveFoodLifestyleMonths: 0,
    smokingLevel: plan.smokingLevel,
    stressSmokingCount: 0,
  },
): MonthSettlementResult {
  const fixedExpenses = resolveLivingExpenses(plan.foodLifestyle, plan.smokingLevel, plan.extraSmokingJpy)
  const fixedExpensesJpy = fixedExpenses.reduce((total, expense) => total + expense.amountJpy, 0)
  const base = calculateBaseSettlement(stats, plan)
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
  const monthlyLivingEffects = livingEffects(plan.foodLifestyle, plan.smokingLevel)
  const afterConsequence = applyEffects({
    ...stats,
    cashJpy: cashJpyAfter,
    debtRmb: debtRmbAfter,
    salaryJpy: plan.income.totalIncomeJpy,
    exchangeRate: plan.exchangeRate,
    actionPoints: plan.actionPointsRemaining,
  }, consequence.effects)
  const settledStats = applyEffects(afterConsequence, monthlyLivingEffects)
  const livingProfile = advanceLivingProfile(currentLivingProfile, plan.foodLifestyle, plan.smokingLevel)

  return {
    stats: settledStats,
    livingProfile,
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
      livingEffects: { ...monthlyLivingEffects },
      exchangeRate: plan.exchangeRate,
      salaryJpy: plan.income.totalIncomeJpy,
      income: { ...plan.income },
      sideHustleIncomeJpy,
      foodLifestyle: plan.foodLifestyle,
      smokingLevel: plan.smokingLevel,
      foodCostJpy: fixedExpenses.find((expense) => expense.id === 'food')?.amountJpy ?? 0,
      smokingCostJpy: fixedExpenses.find((expense) => expense.id === 'smoking')?.amountJpy ?? 0,
      fixedExpenses: fixedExpenses.map((expense) => ({ ...expense })),
      fixedExpensesJpy,
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
