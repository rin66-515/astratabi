import { createInitialSideHustleState, initialGameStats } from '../data/initialState'
import { getAvailableMonthlyActions } from '../data/monthlyActions'
import type {
  GameStats,
  MonthSettlement,
  MonthlyActionDefinition,
  MonthlyActionSelection,
  MonthlyPlan,
  SideHustleRouteId,
  SideHustleState,
} from '../types/game'
import { applyEffects } from './applyEffects'
import { createMonthlyPlan } from './monthPlanning'
import { getMaximumExtraPaymentRmb, settleMonth } from './monthSettlement'
import { applyMonthOpeningRecovery, canPerformMonthlyAction } from './recoveryResolver'
import {
  applySideHustleOutcome,
  sideHustleMonthlyActionProvider,
  unlockEligibleSideHustles,
} from './sideHustleResolver'

export type BalanceStrategyId =
  | 'reference_no_extra'
  | 'salary_only'
  | 'freelance_only'
  | 'materials_only'
  | 'content_only'
  | 'product_focus'
  | 'mixed'
  | 'high_overwork'

export type BalanceRunResult = {
  strategyId: BalanceStrategyId
  horizonMonths: number
  debtClearedMonth: number | null
  cumulativeSideIncomeJpy: number
  averageActionPointsSpent: number
  endingCashJpy: number
  endingDebtRmb: number
  health: number
  mental: number
  stress: number
  recoveryDebt: number
  negativeActionPointMonths: number
  routeLevels: Record<SideHustleRouteId, number>
}

export type PercentileSummary = {
  p10: number
  median: number
  p90: number
}

export type BalanceScenarioSummary = {
  strategyId: BalanceStrategyId
  horizonMonths: number
  runs: number
  debtClearRate: number
  debtClearedMonth: PercentileSummary | null
  cumulativeSideIncomeJpy: PercentileSummary
  averageActionPointsSpent: PercentileSummary
  endingCashJpy: PercentileSummary
  endingDebtRmb: PercentileSummary
  health: PercentileSummary
  mental: PercentileSummary
  stress: PercentileSummary
  recoveryDebt: PercentileSummary
  negativeActionPointMonths: PercentileSummary
  medianRouteLevels: Record<SideHustleRouteId, number>
}

type SimulationState = {
  stats: GameStats
  sideHustles: SideHustleState
  debtClearedMonth: number | null
  actionPointsSpent: number
  latestSettlement: MonthSettlement | null
  negativeActionPointMonths: number
}

const BALANCE_HORIZONS = [12, 18, 24] as const
export const balanceStrategyIds: readonly BalanceStrategyId[] = [
  'reference_no_extra',
  'salary_only',
  'freelance_only',
  'materials_only',
  'content_only',
  'product_focus',
  'mixed',
  'high_overwork',
]

function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let cursor = value
    cursor = Math.imul(cursor ^ (cursor >>> 15), cursor | 1)
    cursor ^= cursor + Math.imul(cursor ^ (cursor >>> 7), cursor | 61)
    return ((cursor ^ (cursor >>> 14)) >>> 0) / 4_294_967_296
  }
}

function calendarAt(elapsedMonth: number) {
  const absoluteMonth = 7 + elapsedMonth
  return {
    year: 2024 + Math.floor(absoluteMonth / 12),
    month: (absoluteMonth % 12) + 1,
  }
}

function actionById(actions: readonly MonthlyActionDefinition[], actionId: string) {
  return actions.find((action) => action.id === actionId)
}

function leastUsedSideHustle(actions: readonly MonthlyActionDefinition[], state: SideHustleState) {
  return actions
    .filter((action) => action.sideHustle)
    .sort((left, right) => {
      const leftCount = state.routes[left.sideHustle!.routeId].completedActions
      const rightCount = state.routes[right.sideHustle!.routeId].completedActions
      return leftCount - rightCount
    })[0]
}

function chooseAction(
  strategyId: BalanceStrategyId,
  elapsedMonth: number,
  actions: readonly MonthlyActionDefinition[],
  sideHustles: SideHustleState,
  stats: GameStats,
): MonthlyActionDefinition | undefined {
  const coreFallback = actionById(actions, 'rest')
  switch (strategyId) {
    case 'reference_no_extra':
      return undefined
    case 'salary_only':
      return coreFallback
    case 'freelance_only':
      return actionById(actions, 'side_hustle_freelance')
        ?? (stats.tech < 40 ? actionById(actions, 'study_tech') : coreFallback)
    case 'materials_only':
      return actionById(actions, 'side_hustle_it_materials')
        ?? (stats.tech < 38
          ? actionById(actions, 'study_tech')
          : stats.workplace < 32
            ? actionById(actions, 'organize_work')
            : coreFallback)
    case 'content_only':
      return actionById(actions, 'side_hustle_content_account') ?? coreFallback
    case 'product_focus':
      return actionById(actions, 'side_hustle_own_product')
        ?? actionById(actions, 'side_hustle_content_account')
        ?? coreFallback
    case 'mixed':
      if (stats.tech < 40) return actionById(actions, 'study_tech')
      if (stats.workplace < 32) return actionById(actions, 'organize_work')
      return leastUsedSideHustle(actions, sideHustles) ?? coreFallback
    case 'high_overwork': {
      if (stats.tech < 40) return actionById(actions, 'study_tech')
      const sideHustleActions = actions.filter((action) => action.sideHustle)
      return sideHustleActions.sort((left, right) => {
        const leftStress = left.effects.stress ?? 0
        const rightStress = right.effects.stress ?? 0
        return (rightStress / right.actionPointCost) - (leftStress / left.actionPointCost)
      })[0] ?? (elapsedMonth === 1 ? actionById(actions, 'study_tech') : coreFallback)
    }
  }
}

function applyAction(
  state: SimulationState,
  plan: MonthlyPlan,
  action: MonthlyActionDefinition,
  elapsedMonth: number,
) {
  const selection: MonthlyActionSelection = {
    actionId: action.id,
    source: action.source,
    label: { ...action.label },
    actionPointCost: action.actionPointCost,
    effects: { ...action.effects },
    sideHustle: action.sideHustle ? { ...action.sideHustle } : undefined,
  }
  state.stats = applyEffects(state.stats, action.effects)
  if (action.sideHustle) {
    state.sideHustles = applySideHustleOutcome(state.sideHustles, action.sideHustle, elapsedMonth)
  }
  plan.actionPointsRemaining -= action.actionPointCost
  plan.selectedActions.push(selection)
}

function chooseExtraPayment(stats: GameStats, plan: MonthlyPlan, strategyId: BalanceStrategyId) {
  if (strategyId === 'reference_no_extra') return 0
  const maximum = getMaximumExtraPaymentRmb(stats, plan)
  return [10_000, 5_000, 2_000].find((preset) => preset <= maximum) ?? 0
}

export function simulateBalanceRun(
  strategyId: BalanceStrategyId,
  horizonMonths: number,
  seed: number,
): BalanceRunResult {
  const random = mulberry32(seed)
  const state: SimulationState = {
    stats: { ...initialGameStats },
    sideHustles: createInitialSideHustleState(),
    debtClearedMonth: null,
    actionPointsSpent: 0,
    latestSettlement: null,
    negativeActionPointMonths: 0,
  }
  const operationalMonths = Math.max(1, horizonMonths - 1)

  // Month 1 is the playable prologue. The recurring planning/settlement loop begins in month 2.
  for (let elapsedMonth = 2; elapsedMonth <= horizonMonths; elapsedMonth += 1) {
    const calendar = calendarAt(elapsedMonth)
    const openingRecovery = applyMonthOpeningRecovery(state.stats, state.latestSettlement)
    state.stats = openingRecovery.stats
    state.sideHustles = unlockEligibleSideHustles(state.sideHustles, {
      elapsedMonth,
      stats: state.stats,
      flags: [],
      sideHustles: state.sideHustles,
    })
    const plan = createMonthlyPlan(
      state.stats,
      { elapsedMonth, ...calendar },
      random,
      openingRecovery.actionPointModifier,
    )

    while (strategyId === 'high_overwork'
      ? plan.actionPointsRemaining > -2
      : plan.actionPointsRemaining > 0) {
      const actions = getAvailableMonthlyActions({
        elapsedMonth,
        stats: state.stats,
        flags: [],
        sideHustles: state.sideHustles,
      }, [sideHustleMonthlyActionProvider])
      let action = chooseAction(strategyId, elapsedMonth, actions, state.sideHustles, state.stats)
      if (
        strategyId === 'high_overwork'
        && (!action || !canPerformMonthlyAction(action.actionPointCost, plan.actionPointsRemaining))
      ) {
        action = actions
          .filter((candidate) => canPerformMonthlyAction(candidate.actionPointCost, plan.actionPointsRemaining))
          .sort((left, right) => (
            ((right.effects.stress ?? 0) + (right.sideHustle ? 1 : 0)
              - (right.id === 'rest' || right.id === 'take_a_walk' ? 100 : 0)) / right.actionPointCost
            - ((left.effects.stress ?? 0) + (left.sideHustle ? 1 : 0)
              - (left.id === 'rest' || left.id === 'take_a_walk' ? 100 : 0)) / left.actionPointCost
          ))[0]
      }
      const canApply = action && (strategyId === 'high_overwork'
        ? canPerformMonthlyAction(action.actionPointCost, plan.actionPointsRemaining)
        : action.actionPointCost <= plan.actionPointsRemaining)
      if (!action || !canApply) break
      applyAction(state, plan, action, elapsedMonth)
      state.sideHustles = unlockEligibleSideHustles(state.sideHustles, {
        elapsedMonth,
        stats: state.stats,
        flags: [],
        sideHustles: state.sideHustles,
      })
    }

    plan.extraPaymentRmb = chooseExtraPayment(state.stats, plan, strategyId)
    const result = settleMonth(state.stats, { elapsedMonth, ...calendar }, plan)
    state.stats = result.stats
    state.latestSettlement = result.settlement
    state.actionPointsSpent += result.settlement.actionPointsSpent
    if (result.settlement.negativeActionPointMonth) state.negativeActionPointMonths += 1
    if (state.debtClearedMonth === null && state.stats.debtRmb <= 0) {
      state.debtClearedMonth = elapsedMonth
    }
  }

  return {
    strategyId,
    horizonMonths,
    debtClearedMonth: state.debtClearedMonth,
    cumulativeSideIncomeJpy: state.sideHustles.totalIncomeJpy,
    averageActionPointsSpent: state.actionPointsSpent / operationalMonths,
    endingCashJpy: state.stats.cashJpy,
    endingDebtRmb: state.stats.debtRmb,
    health: state.stats.health,
    mental: state.stats.mental,
    stress: state.stats.stress,
    recoveryDebt: state.stats.recoveryDebt,
    negativeActionPointMonths: state.negativeActionPointMonths,
    routeLevels: Object.fromEntries(
      Object.entries(state.sideHustles.routes).map(([routeId, route]) => [routeId, route.level]),
    ) as Record<SideHustleRouteId, number>,
  }
}

function percentile(values: readonly number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right)
  if (sorted.length === 0) return 0
  return sorted[Math.floor((sorted.length - 1) * fraction)]
}

function summarize(values: readonly number[]): PercentileSummary {
  return {
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
  }
}

export function summarizeBalanceRuns(runs: readonly BalanceRunResult[]): BalanceScenarioSummary {
  if (runs.length === 0) throw new Error('At least one balance run is required')
  const clearedMonths = runs.flatMap((run) => run.debtClearedMonth === null ? [] : [run.debtClearedMonth])
  const routeIds: readonly SideHustleRouteId[] = ['freelance', 'it_materials', 'content_account', 'own_product']
  return {
    strategyId: runs[0].strategyId,
    horizonMonths: runs[0].horizonMonths,
    runs: runs.length,
    debtClearRate: clearedMonths.length / runs.length,
    debtClearedMonth: clearedMonths.length > 0 ? summarize(clearedMonths) : null,
    cumulativeSideIncomeJpy: summarize(runs.map((run) => run.cumulativeSideIncomeJpy)),
    averageActionPointsSpent: summarize(runs.map((run) => run.averageActionPointsSpent)),
    endingCashJpy: summarize(runs.map((run) => run.endingCashJpy)),
    endingDebtRmb: summarize(runs.map((run) => run.endingDebtRmb)),
    health: summarize(runs.map((run) => run.health)),
    mental: summarize(runs.map((run) => run.mental)),
    stress: summarize(runs.map((run) => run.stress)),
    recoveryDebt: summarize(runs.map((run) => run.recoveryDebt)),
    negativeActionPointMonths: summarize(runs.map((run) => run.negativeActionPointMonths)),
    medianRouteLevels: Object.fromEntries(routeIds.map((routeId) => [
      routeId,
      percentile(runs.map((run) => run.routeLevels[routeId]), 0.5),
    ])) as Record<SideHustleRouteId, number>,
  }
}

export function runBalanceStudy(runCount = 500): BalanceScenarioSummary[] {
  return BALANCE_HORIZONS.flatMap((horizonMonths) => balanceStrategyIds.map((strategyId, strategyIndex) => {
    const runs = Array.from({ length: runCount }, (_, runIndex) => simulateBalanceRun(
      strategyId,
      horizonMonths,
      10_000 * horizonMonths + 1_000 * strategyIndex + runIndex,
    ))
    return summarizeBalanceRuns(runs)
  }))
}
