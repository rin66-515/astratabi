import {
  createInitialSideHustleState,
  initialEmploymentState,
  initialGameStats,
  initialLivingProfile,
} from '../data/initialState'
import { miniGameConfigs } from '../data/miniGames'
import { getAvailableMonthlyActions } from '../data/monthlyActions'
import { monthlyEventDefinitions, monthlyEventMap } from '../data/monthlyEvents'
import type {
  EventCategory,
  EmploymentState,
  FoodLifestyle,
  GameStats,
  LivingProfile,
  MonthSettlement,
  MonthlyActionDefinition,
  MonthlyActionSelection,
  MonthlyPlan,
  SideHustleRouteId,
  SideHustleState,
} from '../types/game'
import { applyEffects } from './applyEffects'
import { resolveEmploymentMonth } from './incomeResolver'
import { resolveMiniGameResult, MINI_GAME_TIMEOUT_ANSWER } from './minigameResolver'
import { createMonthlyPlan } from './monthPlanning'
import { selectMonthlyEventSlot } from './monthlyEventSlot'
import { getMaximumExtraPaymentRmb, settleMonth } from './monthSettlement'
import { applyMonthOpeningRecovery, canPerformMonthlyAction } from './recoveryResolver'
import { isMonthlyActionAvailable, resolveMonthlyActionAvailability } from './monthlyActionAvailability'
import {
  applyFeatureUnlockChanges,
  applySideHustleOutcome,
  sideHustleMonthlyActionProvider,
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
  | 'living_survival'
  | 'living_balanced'
  | 'living_comfortable'
  | 'stress_smoker'
  | 'salary_growth'
  | 'mentor_route'

export type BalanceRunResult = {
  strategyId: BalanceStrategyId
  horizonMonths: number
  debtClearedMonth: number | null
  cumulativeSideIncomeJpy: number
  totalIncomeJpy: number
  totalLivingCostJpy: number
  foodCostJpy: number
  smokingCostJpy: number
  averageActionPointsSpent: number
  endingCashJpy: number
  endingDebtRmb: number
  health: number
  mental: number
  stress: number
  recoveryDebt: number
  lifePoverty: number
  negativeActionPointMonths: number
  routeLevels: Record<SideHustleRouteId, number>
  eventsTriggered: number
  sideHustleFeedbackEvents: number
  eventCategoryCounts: Partial<Record<EventCategory, number>>
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
  totalIncomeJpy: PercentileSummary
  totalLivingCostJpy: PercentileSummary
  foodCostJpy: PercentileSummary
  smokingCostJpy: PercentileSummary
  averageActionPointsSpent: PercentileSummary
  endingCashJpy: PercentileSummary
  endingDebtRmb: PercentileSummary
  health: PercentileSummary
  mental: PercentileSummary
  stress: PercentileSummary
  recoveryDebt: PercentileSummary
  lifePoverty: PercentileSummary
  negativeActionPointMonths: PercentileSummary
  eventsTriggered: PercentileSummary
  sideHustleFeedbackEvents: PercentileSummary
  medianRouteLevels: Record<SideHustleRouteId, number>
}

type SimulationState = {
  stats: GameStats
  sideHustles: SideHustleState
  employment: EmploymentState
  livingProfile: LivingProfile
  debtClearedMonth: number | null
  actionPointsSpent: number
  latestSettlement: MonthSettlement | null
  negativeActionPointMonths: number
  flags: string[]
  completedEventIds: string[]
  eventOccurrences: Record<string, number[]>
  eventCategoryCounts: Partial<Record<EventCategory, number>>
  totalIncomeJpy: number
  totalLivingCostJpy: number
  foodCostJpy: number
  smokingCostJpy: number
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
  'living_survival',
  'living_balanced',
  'living_comfortable',
  'stress_smoker',
  'salary_growth',
  'mentor_route',
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
    case 'mentor_route':
      return coreFallback
    case 'living_survival':
    case 'living_balanced':
    case 'living_comfortable':
      return undefined
    case 'salary_growth':
      if (stats.tech < 56) return actionById(actions, 'study_tech') ?? coreFallback
      if (stats.workplace < 50) return actionById(actions, 'organize_work') ?? coreFallback
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
    case 'high_overwork':
    case 'stress_smoker': {
      if (stats.tech < 40) return actionById(actions, 'study_tech')
      const sideHustleActions = actions.filter((action) => action.sideHustle)
      return sideHustleActions.sort((left, right) => {
        const leftStress = left.effects.stress ?? 0
        const rightStress = right.effects.stress ?? 0
        return (rightStress / right.actionPointCost) - (leftStress / left.actionPointCost)
      })[0]
        ?? actionById(actions, 'study_tech')
        ?? actionById(actions, 'organize_work')
        ?? coreFallback
    }
  }
}

function foodLifestyleFor(strategyId: BalanceStrategyId): FoodLifestyle {
  if (strategyId === 'living_survival') return 'survival'
  if (strategyId === 'living_balanced' || strategyId === 'salary_growth' || strategyId === 'mentor_route') return 'balanced'
  if (strategyId === 'living_comfortable') return 'comfortable'
  return 'frugal'
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

function applySimulatedMonthlyEvent(
  state: SimulationState,
  plan: MonthlyPlan,
  calendar: { year: number; month: number },
  elapsedMonth: number,
  random: () => number,
) {
  const slot = selectMonthlyEventSlot(monthlyEventDefinitions, {
    month: calendar.month,
    elapsedMonth,
    stats: state.stats,
    flags: state.flags,
    completedEventIds: state.completedEventIds,
    sideHustles: state.sideHustles,
    livingProfile: state.livingProfile,
    eventOccurrences: state.eventOccurrences,
  }, elapsedMonth, random)
  if (!slot.eventId) return
  const event = monthlyEventMap.get(slot.eventId)
  if (!event) return
  const option = event.options.find((candidate) => candidate.tone === 'realistic') ?? event.options[0]
  if (!option) return
  state.stats = applyEffects(state.stats, option.effects)
  if (option.monthlyCost?.category === 'smoking') {
    plan.extraSmokingJpy += Math.max(0, option.monthlyCost.amountJpy)
    state.livingProfile = {
      ...state.livingProfile,
      stressSmokingCount: state.livingProfile.stressSmokingCount + 1,
    }
  }
  state.flags = [...new Set([
    ...state.flags.filter((flag) => !(option.removeFlags ?? []).includes(flag)),
    ...(option.addFlags ?? []),
  ])]
  state.completedEventIds.push(event.id)
  state.eventOccurrences[event.id] = [...(state.eventOccurrences[event.id] ?? []), elapsedMonth]
  state.sideHustles = applyFeatureUnlockChanges(
    state.sideHustles,
    option.unlockChanges ?? [],
    elapsedMonth,
    event.id,
  )
  state.eventCategoryCounts[event.category] = (state.eventCategoryCounts[event.category] ?? 0) + 1

  if (!event.miniGame) return
  const config = miniGameConfigs.get(event.miniGame.configId)
  if (!config) return
  const capability = config.type === 'incident_response'
    ? state.stats.tech + state.stats.product * 0.5 + state.stats.workTrust * 0.25 - state.stats.stress * 0.25
    : config.type === 'design_review'
      ? state.stats.tech + state.stats.workplace + state.stats.product * 0.25 - state.stats.stress * 0.25
      : state.stats.workplace + state.stats.boundary
        + state.stats.japanese * 0.25 - state.stats.stress * 0.35
  const answers = Object.fromEntries(config.stages.map((stage) => {
    if (capability >= 75) return [stage.id, stage.options[0]?.id ?? MINI_GAME_TIMEOUT_ANSWER]
    if (capability >= 45) return [stage.id, stage.options[1]?.id ?? MINI_GAME_TIMEOUT_ANSWER]
    return [stage.id, MINI_GAME_TIMEOUT_ANSWER]
  }))
  const result = resolveMiniGameResult(config, answers)
  state.stats = applyEffects(state.stats, result.effects)
  state.flags = [...new Set([...state.flags, ...(result.flags ?? [])])]
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
    employment: { ...initialEmploymentState },
    livingProfile: {
      ...initialLivingProfile,
      foodLifestyle: foodLifestyleFor(strategyId),
      smokingLevel: strategyId === 'stress_smoker' ? 'heavy' : initialLivingProfile.smokingLevel,
    },
    debtClearedMonth: null,
    actionPointsSpent: 0,
    latestSettlement: null,
    negativeActionPointMonths: 0,
    flags: [],
    completedEventIds: [],
    eventOccurrences: {},
    eventCategoryCounts: {},
    totalIncomeJpy: 0,
    totalLivingCostJpy: 0,
    foodCostJpy: 0,
    smokingCostJpy: 0,
  }
  const strategyRoutes: Partial<Record<BalanceStrategyId, SideHustleRouteId[]>> = {
    freelance_only: ['freelance'],
    materials_only: ['it_materials'],
    content_only: ['content_account'],
    product_focus: ['content_account', 'own_product'],
    mixed: ['freelance', 'it_materials', 'content_account', 'own_product'],
    high_overwork: ['freelance', 'it_materials', 'content_account', 'own_product'],
    stress_smoker: ['freelance', 'it_materials', 'content_account', 'own_product'],
  }
  state.sideHustles = applyFeatureUnlockChanges(
    state.sideHustles,
    (strategyRoutes[strategyId] ?? []).map((featureId) => ({ featureId, state: 'unlocked' as const })),
    2,
    'balance-scenario',
  )
  const operationalMonths = Math.max(1, horizonMonths - 1)

  // Month 1 is the playable prologue. The recurring planning/settlement loop begins in month 2.
  for (let elapsedMonth = 2; elapsedMonth <= horizonMonths; elapsedMonth += 1) {
    const calendar = calendarAt(elapsedMonth)
    if (strategyId === 'mentor_route' && elapsedMonth >= 6 && !state.flags.includes('mentoring_junior_active')) {
      state.flags.push('mentoring_junior_active')
    }
    const openingRecovery = applyMonthOpeningRecovery(state.stats, state.latestSettlement)
    state.stats = openingRecovery.stats
    const employmentResolution = resolveEmploymentMonth(
      state.employment,
      state.stats,
      elapsedMonth,
      state.flags,
    )
    state.employment = employmentResolution.employment
    state.stats = { ...state.stats, salaryJpy: employmentResolution.income.totalIncomeJpy }
    const plan = createMonthlyPlan(
      state.stats,
      { elapsedMonth, ...calendar },
      random,
      openingRecovery.actionPointModifier + employmentResolution.actionPointModifier,
      {
        income: employmentResolution.income,
        foodLifestyle: foodLifestyleFor(strategyId),
        smokingLevel: strategyId === 'stress_smoker' ? 'heavy' : state.livingProfile.smokingLevel,
      },
    )
    applySimulatedMonthlyEvent(state, plan, calendar, elapsedMonth, random)
    const actionContext = {
      elapsedMonth,
      stats: state.stats,
      flags: state.flags,
      sideHustles: state.sideHustles,
    }
    const plannedActions = getAvailableMonthlyActions(actionContext, [sideHustleMonthlyActionProvider])
    plan.actionAvailability = resolveMonthlyActionAvailability(
      plannedActions,
      actionContext,
      plan.actionPointsGranted,
      random,
    )

    while (strategyId === 'high_overwork' || strategyId === 'stress_smoker'
      ? plan.actionPointsRemaining > -2
      : plan.actionPointsRemaining > 0) {
      const actions = getAvailableMonthlyActions({
        elapsedMonth,
        stats: state.stats,
        flags: state.flags,
        sideHustles: state.sideHustles,
      }, [sideHustleMonthlyActionProvider]).filter((action) => isMonthlyActionAvailable(plan, action.id))
      let action = chooseAction(strategyId, elapsedMonth, actions, state.sideHustles, state.stats)
      if (
        (strategyId === 'high_overwork' || strategyId === 'stress_smoker')
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
      const canApply = action && (strategyId === 'high_overwork' || strategyId === 'stress_smoker'
        ? canPerformMonthlyAction(action.actionPointCost, plan.actionPointsRemaining)
        : action.actionPointCost <= plan.actionPointsRemaining)
      if (!action || !canApply) break
      applyAction(state, plan, action, elapsedMonth)
    }

    plan.extraPaymentRmb = chooseExtraPayment(state.stats, plan, strategyId)
    const result = settleMonth(state.stats, { elapsedMonth, ...calendar }, plan, state.livingProfile)
    state.stats = result.stats
    state.livingProfile = result.livingProfile
    state.latestSettlement = result.settlement
    state.totalIncomeJpy += result.settlement.salaryJpy + result.settlement.sideHustleIncomeJpy
    state.totalLivingCostJpy += result.settlement.fixedExpensesJpy
    state.foodCostJpy += result.settlement.foodCostJpy
    state.smokingCostJpy += result.settlement.smokingCostJpy
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
    totalIncomeJpy: state.totalIncomeJpy,
    totalLivingCostJpy: state.totalLivingCostJpy,
    foodCostJpy: state.foodCostJpy,
    smokingCostJpy: state.smokingCostJpy,
    averageActionPointsSpent: state.actionPointsSpent / operationalMonths,
    endingCashJpy: state.stats.cashJpy,
    endingDebtRmb: state.stats.debtRmb,
    health: state.stats.health,
    mental: state.stats.mental,
    stress: state.stats.stress,
    recoveryDebt: state.stats.recoveryDebt,
    lifePoverty: state.stats.lifePoverty,
    negativeActionPointMonths: state.negativeActionPointMonths,
    eventsTriggered: state.completedEventIds.length,
    sideHustleFeedbackEvents: state.eventCategoryCounts.sidejob ?? 0,
    eventCategoryCounts: { ...state.eventCategoryCounts },
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
    totalIncomeJpy: summarize(runs.map((run) => run.totalIncomeJpy)),
    totalLivingCostJpy: summarize(runs.map((run) => run.totalLivingCostJpy)),
    foodCostJpy: summarize(runs.map((run) => run.foodCostJpy)),
    smokingCostJpy: summarize(runs.map((run) => run.smokingCostJpy)),
    averageActionPointsSpent: summarize(runs.map((run) => run.averageActionPointsSpent)),
    endingCashJpy: summarize(runs.map((run) => run.endingCashJpy)),
    endingDebtRmb: summarize(runs.map((run) => run.endingDebtRmb)),
    health: summarize(runs.map((run) => run.health)),
    mental: summarize(runs.map((run) => run.mental)),
    stress: summarize(runs.map((run) => run.stress)),
    recoveryDebt: summarize(runs.map((run) => run.recoveryDebt)),
    lifePoverty: summarize(runs.map((run) => run.lifePoverty)),
    negativeActionPointMonths: summarize(runs.map((run) => run.negativeActionPointMonths)),
    eventsTriggered: summarize(runs.map((run) => run.eventsTriggered)),
    sideHustleFeedbackEvents: summarize(runs.map((run) => run.sideHustleFeedbackEvents)),
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
