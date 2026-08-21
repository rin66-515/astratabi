import { monthlyEventDefinitions } from '../data/monthlyEvents'
import { getAvailableMonthlyActions } from '../data/monthlyActions'
import { timePassageCauseContent } from '../data/timePassage'
import type {
  GameSaveState,
  MonthlyActionDefinition,
  MonthlyActionSelection,
  MonthlyPlan,
  StagePolicyId,
  TimePassageCauseId,
  TimePassageState,
} from '../types/game'
import { applyEffects } from './applyEffects'
import { resolveEmploymentMonth } from './incomeResolver'
import { createMonthlyPlan } from './monthPlanning'
import { getMaximumExtraPaymentRmb, settleMonth } from './monthSettlement'
import { selectMonthlyEventSlot } from './monthlyEventSlot'
import { resolveMonthlyActionAvailability, isMonthlyActionAvailable } from './monthlyActionAvailability'
import { applyMonthOpeningRecovery, canPerformMonthlyAction } from './recoveryResolver'
import {
  applySideHustleOutcome,
  sideHustleMonthlyActionProvider,
  sideHustleRouteIds,
} from './sideHustleResolver'

const HARD_CHECKPOINTS = [12, 18] as const
const MAX_DISRUPTIVE_PASSAGES = 2
const DISRUPTIVE_COOLDOWN_MONTHS = 5

export type TimePassageResolution = {
  state: GameSaveState
  passage: TimePassageState | null
  resumeEventId: string | null
}

function followingCalendarMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

function weightedPick<T extends string>(entries: Array<{ id: T; weight: number }>, random: () => number): T {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0)
  if (total <= 0) return entries[0].id
  let cursor = Math.min(0.999999, Math.max(0, random())) * total
  return entries.find((entry) => {
    cursor -= Math.max(0, entry.weight)
    return cursor < 0
  })?.id ?? entries.at(-1)!.id
}

function hasUnlockedSideHustle(state: GameSaveState) {
  return sideHustleRouteIds.some((routeId) => state.sideHustles.routes[routeId].state === 'unlocked')
}

function chooseCause(state: GameSaveState, policy: StagePolicyId, random: () => number): TimePassageCauseId {
  const disruptive = state.timePassageHistory.filter((record) => timePassageCauseContent[record.causeId].disruptive)
  const lastDisruptive = disruptive.at(-1)
  const disruptiveAllowed = disruptive.length < MAX_DISRUPTIVE_PASSAGES
    && (!lastDisruptive || state.progress.elapsedMonths - lastDisruptive.toElapsedMonth >= DISRUPTIVE_COOLDOWN_MONTHS)
  const entries: Array<{ id: TimePassageCauseId; weight: number }> = [{ id: 'quiet', weight: 60 }]

  if (disruptiveAllowed && (state.stats.health <= 55 || state.livingProfile.consecutiveFoodLifestyleMonths >= 2)) {
    entries.push({ id: 'illness', weight: 20 + Math.max(0, 55 - state.stats.health) })
  }
  if (disruptiveAllowed && state.stats.workTrust >= 8 && (state.stats.boundary < 35 || state.stats.stress >= 55)) {
    entries.push({ id: 'project_crunch', weight: 18 + Math.max(0, state.stats.stress - 55) / 2 })
  }
  if (disruptiveAllowed && (state.stats.mental <= 60 || state.stats.stress >= 55 || state.stats.lossOfControl >= 20)) {
    entries.push({ id: 'game_absorption', weight: 16 + Math.max(0, 60 - state.stats.mental) / 2 })
  }
  if (policy === 'side_hustle' && hasUnlockedSideHustle(state)) {
    entries.push({ id: 'side_hustle_sprint', weight: 32 })
  }
  return weightedPick(entries, random)
}

function maximumSkippableMonths(elapsedMonth: number) {
  const checkpoint = HARD_CHECKPOINTS.find((month) => month > elapsedMonth)
  return checkpoint === undefined ? 3 : Math.max(0, checkpoint - elapsedMonth - 1)
}

function actionIdsForPolicy(
  policy: StagePolicyId,
  causeId: TimePassageCauseId,
  actions: readonly MonthlyActionDefinition[],
  previousActions: readonly MonthlyActionSelection[],
) {
  if (causeId === 'illness') return ['rest', 'rest']
  if (causeId === 'project_crunch') return ['organize_work', 'organize_work']
  if (causeId === 'game_absorption') return []

  const previousSideHustleId = previousActions.find((action) => action.source === 'sidejob')?.actionId
  const availableSideHustleId = actions.find((action) => action.source === 'sidejob')?.id
  const sideHustleId = previousSideHustleId ?? availableSideHustleId
  if (policy === 'recovery') return ['rest', 'rest', 'take_a_walk']
  if (policy === 'career') return ['organize_work', 'study_japanese', 'study_tech']
  if (policy === 'study') return ['study_tech', 'study_japanese', 'rest']
  if (policy === 'debt') return ['organize_work', 'rest']
  if (policy === 'side_hustle' && sideHustleId) return [sideHustleId, sideHustleId, 'rest']
  return ['organize_work', 'rest', 'take_a_walk']
}

function applyPolicyActions(
  state: GameSaveState,
  plan: MonthlyPlan,
  policy: StagePolicyId,
  causeId: TimePassageCauseId,
) {
  let stats = state.stats
  let sideHustles = state.sideHustles
  let currentPlan = plan
  const actions = getAvailableMonthlyActions({
    elapsedMonth: plan.elapsedMonth,
    stats,
    flags: state.flags,
    sideHustles,
  }, [sideHustleMonthlyActionProvider])
  const previousActions = state.monthlySettlements.at(-1)?.actions ?? []

  for (const actionId of actionIdsForPolicy(policy, causeId, actions, previousActions)) {
    const action = actions.find((candidate) => candidate.id === actionId)
    if (!action
      || !isMonthlyActionAvailable(currentPlan, action.id)
      || !canPerformMonthlyAction(action.actionPointCost, currentPlan.actionPointsRemaining)) continue
    const actionPointsRemaining = currentPlan.actionPointsRemaining - action.actionPointCost
    stats = applyEffects(stats, action.effects)
    if (action.sideHustle) {
      sideHustles = applySideHustleOutcome(sideHustles, action.sideHustle, plan.elapsedMonth)
    }
    currentPlan = {
      ...currentPlan,
      actionPointsRemaining,
      selectedActions: [...currentPlan.selectedActions, {
        actionId: action.id,
        source: action.source,
        label: { ...action.label },
        actionPointCost: action.actionPointCost,
        effects: { ...action.effects },
        sideHustle: action.sideHustle ? { ...action.sideHustle } : undefined,
      }],
    }
  }
  return { stats: { ...stats, actionPoints: currentPlan.actionPointsRemaining }, sideHustles, plan: currentPlan }
}

function importantEventBeforeNextMonth(state: GameSaveState, random: () => number) {
  const calendar = followingCalendarMonth(state.year, state.month)
  const elapsedMonth = state.progress.elapsedMonths + 1
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
  return slot.kind === 'major' ? slot.eventId : null
}

function settleSkippedMonth(
  state: GameSaveState,
  policy: StagePolicyId,
  causeId: TimePassageCauseId,
  random: () => number,
) {
  const calendar = followingCalendarMonth(state.year, state.month)
  const elapsedMonth = state.progress.elapsedMonths + 1
  const previousSettlement = state.monthlySettlements.at(-1) ?? null
  const recovery = applyMonthOpeningRecovery(state.stats, previousSettlement)
  const employmentResolution = resolveEmploymentMonth(state.employment, recovery.stats, elapsedMonth, state.flags)
  const causeEffects = timePassageCauseContent[causeId].monthlyEffects
  const openingStats = applyEffects({
    ...recovery.stats,
    salaryJpy: employmentResolution.income.totalIncomeJpy,
  }, causeEffects)
  const previous = state.monthlySettlements.at(-1)
  let plan = createMonthlyPlan(openingStats, { ...calendar, elapsedMonth }, random,
    recovery.actionPointModifier + employmentResolution.actionPointModifier, {
      income: employmentResolution.income,
      foodLifestyle: previous?.foodLifestyle ?? state.livingProfile.foodLifestyle,
      smokingLevel: previous?.smokingLevel ?? state.livingProfile.smokingLevel,
    })
  plan = {
    ...plan,
    stagePolicy: policy,
    extraPaymentRmb: previous?.extraPaymentRmb ?? 0,
  }
  const actions = getAvailableMonthlyActions({ elapsedMonth, stats: openingStats, flags: state.flags, sideHustles: state.sideHustles }, [sideHustleMonthlyActionProvider])
  plan = {
    ...plan,
    actionAvailability: resolveMonthlyActionAvailability(
      actions,
      { elapsedMonth, stats: openingStats, flags: state.flags, sideHustles: state.sideHustles },
      plan.actionPointsGranted,
      random,
    ),
  }
  const acted = applyPolicyActions({ ...state, stats: openingStats }, plan, policy, causeId)
  const paymentPlan = policy === 'debt'
    ? {
        ...acted.plan,
        extraPaymentRmb: Math.min(
          getMaximumExtraPaymentRmb(acted.stats, acted.plan),
          Math.max(5_000, acted.plan.extraPaymentRmb),
        ),
      }
    : acted.plan
  const result = settleMonth(acted.stats, { ...calendar, elapsedMonth }, paymentPlan, state.livingProfile)
  const debtClearedMonth = result.stats.debtRmb <= 0 && state.progress.debtClearedMonth === null
    ? elapsedMonth
    : state.progress.debtClearedMonth
  return {
    ...state,
    ...calendar,
    stats: result.stats,
    employment: employmentResolution.employment,
    sideHustles: acted.sideHustles,
    livingProfile: result.livingProfile,
    monthlyPlan: null,
    monthlyEventSlot: null,
    currentEventId: null,
    resolution: null,
    monthlySettlements: [...state.monthlySettlements, result.settlement],
    progress: { ...state.progress, elapsedMonths: elapsedMonth, debtClearedMonth },
  } satisfies GameSaveState
}

export function resolveTimePassage(
  state: GameSaveState,
  random: () => number = Math.random,
): TimePassageResolution {
  const latestSettlement = state.monthlySettlements.at(-1)
  if (!latestSettlement || state.progress.elapsedMonths < 3 || state.stats.debtRmb <= 0) {
    return { state, passage: null, resumeEventId: null }
  }
  const maximum = maximumSkippableMonths(state.progress.elapsedMonths)
  if (maximum <= 0) return { state, passage: null, resumeEventId: null }

  const policy = latestSettlement.stagePolicy
  const causeId = chooseCause(state, policy, random)
  const cause = timePassageCauseContent[causeId]
  const requested = cause.minSkippedMonths
    + Math.floor(Math.min(0.999999, Math.max(0, random())) * (cause.maxSkippedMonths - cause.minSkippedMonths + 1))
  const target = Math.min(maximum, requested)
  const statsBefore = { ...state.stats }
  const fromElapsedMonth = state.progress.elapsedMonths
  let current = state
  let resumeEventId: string | null = null
  const monthSummaries: TimePassageState['months'] = []

  for (let index = 0; index < target; index += 1) {
    resumeEventId = importantEventBeforeNextMonth(current, random)
    if (resumeEventId) break
    current = settleSkippedMonth(current, policy, causeId, random)
    const settlement = current.monthlySettlements.at(-1)!
    monthSummaries.push({
      elapsedMonth: settlement.elapsedMonth,
      year: settlement.year,
      month: settlement.month,
      debtRmbAfter: settlement.debtRmbAfter,
      cashJpyAfter: settlement.cashJpyAfter,
      healthAfter: current.stats.health,
      mentalAfter: current.stats.mental,
      stressAfter: current.stats.stress,
      actions: settlement.actions.map((action) => ({ ...action.label })),
    })
    if (current.stats.debtRmb <= 0) break
  }

  if (monthSummaries.length === 0) return { state, passage: null, resumeEventId }
  const passage: TimePassageState = {
    causeId,
    policy,
    fromElapsedMonth,
    toElapsedMonth: current.progress.elapsedMonths,
    skippedMonths: monthSummaries.length,
    statsBefore,
    statsAfter: { ...current.stats },
    months: monthSummaries,
    resumeEventId,
  }
  return {
    state: current,
    passage,
    resumeEventId,
  }
}
