import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { firstMonthEventMap, firstMonthEvents } from '../data/events/firstMonth'
import { createEndingDebugState } from '../data/endingDebugScenarios'
import { createInitialGameSaveState } from '../data/initialState'
import { miniGameConfigs } from '../data/miniGames'
import { monthlyEventDefinitions, monthlyEventMap } from '../data/monthlyEvents'
import { getAvailableMonthlyActions } from '../data/monthlyActions'
import { applyEffects } from '../engine/applyEffects'
import { checkConditions } from '../engine/checkCondition'
import { resolveFinalEnding } from '../engine/endingResolver'
import { pickNextStoryEvent } from '../engine/eventSelection'
import { resolveMonthTransition } from '../engine/monthResolver'
import { createMonthlyPlan } from '../engine/monthPlanning'
import { incomeBreakdown, resolveEmploymentMonth } from '../engine/incomeResolver'
import { getMaximumExtraPaymentRmb, settleMonth } from '../engine/monthSettlement'
import {
  completeMonthlyEventSlot,
  completeMonthlyMiniGameSlot,
  selectMonthlyEventSlot,
} from '../engine/monthlyEventSlot'
import {
  answerMiniGameStage,
  applyMiniGameResult,
  createMiniGameSession,
  MINI_GAME_TIMEOUT_ANSWER,
} from '../engine/minigameResolver'
import { applyMonthOpeningRecovery, canPerformMonthlyAction } from '../engine/recoveryResolver'
import {
  applySideHustleOutcome,
  sideHustleMonthlyActionProvider,
  unlockEligibleSideHustles,
} from '../engine/sideHustleResolver'
import type {
  EventContext,
  FinalEndingId,
  GameEffects,
  GameSaveState,
  GameStats,
  Language,
  MonthlyPlan,
  FoodLifestyle,
} from '../types/game'
import { trackEvent } from '../utils/trackEvent'
import { migrateGameSave } from './saveMigration'

const SAVE_KEY = 'astratabi:yunyue-fusheng:v1'

type GameActions = {
  setLanguage: (language: Language) => void
  startNewGame: () => void
  beginMonth: () => void
  chooseOption: (optionId: string) => void
  advance: () => void
  showPreview: () => void
  enterNextMonth: () => void
  prepareMonth: () => void
  performMonthlyAction: (actionId: string) => void
  setExtraPayment: (amountRmb: number) => void
  setFoodLifestyle: (foodLifestyle: FoodLifestyle) => void
  completeMonth: () => void
  continueAfterMonthSettlement: () => void
  completeAnnualReport: () => void
  continueAfterStageEnding: () => void
  chooseMonthlyMiniGameOption: (optionId: string) => void
  timeoutMonthlyMiniGame: () => void
  continueAfterMonthlyMiniGame: () => void
  chooseDebtFreeMonth: (optionId: string) => void
  completeDebtFreeScene: () => void
  simulateFinalEnding: (endingId: FinalEndingId) => void
}

export type GameStore = GameSaveState & GameActions

function mergeEffects(left: GameEffects, right: GameEffects = {}): GameEffects {
  const merged = { ...left }
  for (const [key, delta] of Object.entries(right)) {
    const stat = key as keyof GameStats
    merged[stat] = (merged[stat] ?? 0) + (delta ?? 0)
  }
  return merged
}

function contextOf(state: GameSaveState, stats = state.stats, flags = state.flags): EventContext {
  return {
    month: state.month,
    elapsedMonth: state.progress.elapsedMonths,
    stats,
    flags,
    completedEventIds: state.completedEventIds,
    sideHustles: state.sideHustles,
    livingProfile: state.livingProfile,
  }
}

function addUnique(values: string[], additions: string[] = []) {
  return [...new Set([...values, ...additions])]
}

function followingCalendarMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

function nextMonthlyCycle(state: GameSaveState): Partial<GameSaveState> {
  const calendar = followingCalendarMonth(state.year, state.month)
  const elapsedMonths = state.progress.elapsedMonths + 1
  const previousSettlement = state.monthlySettlements.at(-1) ?? null
  const openingRecovery = applyMonthOpeningRecovery(state.stats, previousSettlement)
  const employmentResolution = resolveEmploymentMonth(
    state.employment,
    openingRecovery.stats,
    elapsedMonths,
    state.flags,
  )
  const openingStats = {
    ...openingRecovery.stats,
    salaryJpy: employmentResolution.income.totalIncomeJpy,
  }
  const sideHustles = unlockEligibleSideHustles(state.sideHustles, {
    elapsedMonth: elapsedMonths,
    stats: openingStats,
    flags: state.flags,
    sideHustles: state.sideHustles,
  })
  const monthlyPlan = createMonthlyPlan(openingStats, {
    ...calendar,
    elapsedMonth: elapsedMonths,
  }, Math.random, openingRecovery.actionPointModifier + employmentResolution.actionPointModifier, {
    income: employmentResolution.income,
    foodLifestyle: state.livingProfile.foodLifestyle,
    smokingLevel: state.livingProfile.smokingLevel,
  })
  const monthlyEventSlot = selectMonthlyEventSlot(monthlyEventDefinitions, {
    month: calendar.month,
    elapsedMonth: elapsedMonths,
    stats: openingStats,
    flags: state.flags,
    completedEventIds: state.completedEventIds,
    sideHustles,
    livingProfile: state.livingProfile,
  }, elapsedMonths)
  return {
    ...calendar,
    screen: monthlyEventSlot.status === 'pending' ? 'event' : 'monthly-cycle',
    currentEventId: monthlyEventSlot.eventId,
    resolution: null,
    activeMiniGame: null,
    monthlyEventSlot,
    stats: { ...openingStats, actionPoints: monthlyPlan.actionPointsGranted },
    employment: employmentResolution.employment,
    sideHustles,
    monthlyPlan,
    progress: {
      ...state.progress,
      phase: 'normal',
      elapsedMonths,
      stageEnding: null,
    },
  }
}

function currentMonthlyPlan(state: GameSaveState): MonthlyPlan {
  return state.monthlyPlan ?? createMonthlyPlan(state.stats, {
    elapsedMonth: state.progress.elapsedMonths,
    year: state.year,
    month: state.month,
  }, Math.random, 0, {
    income: incomeBreakdown(state.employment),
    foodLifestyle: state.livingProfile.foodLifestyle,
    smokingLevel: state.livingProfile.smokingLevel,
  })
}

function enterDebtFreeMonth(state: GameSaveState): Partial<GameSaveState> {
  const calendar = followingCalendarMonth(state.year, state.month)
  return {
    ...calendar,
    screen: 'debt-free-month',
    monthlyPlan: null,
    debtFreeChoiceId: null,
    progress: {
      ...state.progress,
      phase: 'debt_free_month',
      elapsedMonths: state.progress.elapsedMonths + 1,
      debtFreeMonthStarted: true,
      stageEnding: null,
    },
  }
}

function transitionAfterMonth(state: GameSaveState): Partial<GameSaveState> {
  const transition = resolveMonthTransition(state)
  switch (transition.kind) {
    case 'annual_report':
      return {
        screen: 'annual-report',
        monthlyPlan: null,
        progress: { ...state.progress, phase: 'annual_report' },
      }
    case 'stage_ending':
      return {
        screen: 'stage-ending',
        monthlyPlan: null,
        progress: { ...state.progress, phase: 'stage_ending', stageEnding: transition.endingId },
      }
    case 'debt_free_month':
      return enterDebtFreeMonth(state)
    case 'final_ending':
      return {
        screen: 'final-ending',
        monthlyPlan: null,
        progress: { ...state.progress, phase: 'final_ending', finalEnding: transition.endingId },
      }
    case 'next_month':
      return nextMonthlyCycle(state)
  }
}

const debtFreeChoices: Record<string, GameEffects> = {
  save: { freedom: 3, mental: 2 },
  travel: { cashJpy: -30_000, freedom: 6, mental: 6 },
  small_luxury: { cashJpy: -12_000, mental: 4, lifePoverty: -4 },
  rest: { health: 5, mental: 5, recoveryDebt: -5 },
}

export const useGameStore = create<GameStore>()(persist((set, get) => ({
  ...createInitialGameSaveState('zh'),

  setLanguage: (language) => {
    set({ language })
    trackEvent('language_change', { language })
  },

  startNewGame: () => {
    const language = get().language
    set({ ...createInitialGameSaveState(language), startedAt: new Date().toISOString() })
    trackEvent('game_start', { language })
  },

  beginMonth: () => {
    const state = get()
    const nextEvent = pickNextStoryEvent(firstMonthEvents, contextOf(state))
    set({ screen: 'event', currentEventId: nextEvent?.id ?? null, resolution: null })
  },

  chooseOption: (optionId) => {
    const state = get()
    if (!state.currentEventId || state.resolution) return
    const event = firstMonthEventMap.get(state.currentEventId) ?? monthlyEventMap.get(state.currentEventId)
    const option = event?.options.find((candidate) => candidate.id === optionId)
    if (!event || !option) return

    let combinedEffects: GameEffects = { ...(option.effects ?? {}) }
    let nextStats = applyEffects(state.stats, combinedEffects)
    let nextFlags = addUnique(
      state.flags.filter((flag) => !(option.removeFlags ?? []).includes(flag)),
      option.addFlags,
    )
    const response = [...(option.response ?? [])]

    for (const consequence of option.consequences ?? []) {
      const consequenceContext = contextOf(state, nextStats, nextFlags)
      const chancePassed = consequence.chance === undefined || Math.random() < consequence.chance
      if (!chancePassed || !checkConditions(consequence.conditions, consequenceContext)) continue
      combinedEffects = mergeEffects(combinedEffects, consequence.effects)
      nextStats = applyEffects(nextStats, consequence.effects)
      nextFlags = addUnique(nextFlags, consequence.addFlags)
      response.push(...(consequence.response ?? []))
    }

    const completedEventIds = addUnique(state.completedEventIds, [event.id])
    const history = [...state.history, { eventId: event.id, optionId, chosenAt: new Date().toISOString() }]
    const monthlyPlan = state.monthlyPlan && option.monthlyCost?.category === 'smoking'
      ? {
          ...state.monthlyPlan,
          extraSmokingJpy: state.monthlyPlan.extraSmokingJpy + Math.max(0, option.monthlyCost.amountJpy),
        }
      : state.monthlyPlan
    set({
      stats: nextStats,
      flags: nextFlags,
      completedEventIds,
      history,
      monthlyPlan,
      livingProfile: option.monthlyCost?.category === 'smoking'
        ? { ...state.livingProfile, stressSmokingCount: state.livingProfile.stressSmokingCount + 1 }
        : state.livingProfile,
      resolution: { eventId: event.id, optionId, effects: combinedEffects, response },
    })
    trackEvent('event_choice', { eventId: event.id, optionId })
  },

  advance: () => {
    const state = get()
    if (!state.currentEventId || !state.resolution) return
    const event = firstMonthEventMap.get(state.currentEventId) ?? monthlyEventMap.get(state.currentEventId)
    if (!event) return

    if (state.monthlyEventSlot?.eventId === event.id) {
      const monthlyEventSlot = completeMonthlyEventSlot(state.monthlyEventSlot)
      if (monthlyEventSlot.status === 'mini_game_pending' && monthlyEventSlot.miniGame) {
        const config = miniGameConfigs.get(monthlyEventSlot.miniGame.configId)
        if (!config) throw new Error(`Unknown MiniGame config ${monthlyEventSlot.miniGame.configId}`)
        set({
          screen: 'monthly-minigame',
          currentEventId: null,
          resolution: null,
          monthlyEventSlot,
          activeMiniGame: createMiniGameSession(event.id, config),
        })
        trackEvent('minigame_start', { eventId: event.id, configId: config.id })
      } else {
        set({
          screen: 'monthly-cycle',
          currentEventId: null,
          resolution: null,
          monthlyEventSlot,
        })
      }
      return
    }

    if (event.onComplete) {
      set({ screen: event.onComplete, currentEventId: null, resolution: null })
      if (event.onComplete === 'month-summary') trackEvent('month_complete', { month: state.month })
      return
    }

    const nextContext: EventContext = {
      month: state.month,
      elapsedMonth: state.progress.elapsedMonths,
      stats: state.stats,
      flags: state.flags,
      completedEventIds: state.completedEventIds,
      sideHustles: state.sideHustles,
      livingProfile: state.livingProfile,
    }
    const nextEvent = pickNextStoryEvent(firstMonthEvents, nextContext)
    set({ currentEventId: nextEvent?.id ?? null, resolution: null })
  },

  showPreview: () => set({ screen: 'preview', currentEventId: null, resolution: null }),

  enterNextMonth: () => {
    const state = get()
    if (state.screen !== 'preview') return
    set(nextMonthlyCycle(state))
  },

  prepareMonth: () => {
    const state = get()
    if (state.screen !== 'monthly-cycle' || state.monthlyPlan) return
    const employmentResolution = resolveEmploymentMonth(
      state.employment,
      state.stats,
      state.progress.elapsedMonths,
      state.flags,
    )
    const stats = { ...state.stats, salaryJpy: employmentResolution.income.totalIncomeJpy }
    const monthlyPlan = createMonthlyPlan(stats, {
      elapsedMonth: state.progress.elapsedMonths,
      year: state.year,
      month: state.month,
    }, Math.random, employmentResolution.actionPointModifier, {
      income: employmentResolution.income,
      foodLifestyle: state.livingProfile.foodLifestyle,
      smokingLevel: state.livingProfile.smokingLevel,
    })
    const sideHustles = unlockEligibleSideHustles(state.sideHustles, {
      elapsedMonth: state.progress.elapsedMonths,
      stats,
      flags: state.flags,
      sideHustles: state.sideHustles,
    })
    set({
      monthlyPlan,
      employment: employmentResolution.employment,
      stats: { ...stats, actionPoints: monthlyPlan.actionPointsGranted },
      sideHustles,
    })
  },

  performMonthlyAction: (actionId) => {
    const state = get()
    if (state.screen !== 'monthly-cycle' || !state.monthlyPlan) return
    const unlockedSideHustles = unlockEligibleSideHustles(state.sideHustles, {
      elapsedMonth: state.progress.elapsedMonths,
      stats: state.stats,
      flags: state.flags,
      sideHustles: state.sideHustles,
    })
    const action = getAvailableMonthlyActions({
      elapsedMonth: state.progress.elapsedMonths,
      stats: state.stats,
      flags: state.flags,
      sideHustles: unlockedSideHustles,
    }, [sideHustleMonthlyActionProvider]).find((candidate) => candidate.id === actionId)
    if (!action || !canPerformMonthlyAction(action.actionPointCost, state.monthlyPlan.actionPointsRemaining)) return

    const actionPointsRemaining = state.monthlyPlan.actionPointsRemaining - action.actionPointCost
    const nextStats = applyEffects(state.stats, action.effects)
    const progressedSideHustles = action.sideHustle
      ? applySideHustleOutcome(unlockedSideHustles, action.sideHustle, state.progress.elapsedMonths)
      : unlockedSideHustles
    const nextSideHustles = unlockEligibleSideHustles(progressedSideHustles, {
      elapsedMonth: state.progress.elapsedMonths,
      stats: nextStats,
      flags: state.flags,
      sideHustles: progressedSideHustles,
    })
    set({
      stats: {
        ...nextStats,
        actionPoints: actionPointsRemaining,
      },
      sideHustles: nextSideHustles,
      monthlyPlan: {
        ...state.monthlyPlan,
        actionPointsRemaining,
        selectedActions: [
          ...state.monthlyPlan.selectedActions,
          {
            actionId: action.id,
            source: action.source,
            label: { ...action.label },
            actionPointCost: action.actionPointCost,
            effects: { ...action.effects },
            sideHustle: action.sideHustle ? { ...action.sideHustle } : undefined,
          },
        ],
      },
    })
    trackEvent('monthly_action', { actionId, month: state.progress.elapsedMonths })
  },

  setExtraPayment: (amountRmb) => {
    const state = get()
    if (state.screen !== 'monthly-cycle' || !state.monthlyPlan) return
    const maximum = getMaximumExtraPaymentRmb(state.stats, state.monthlyPlan)
    set({
      monthlyPlan: {
        ...state.monthlyPlan,
        extraPaymentRmb: Math.min(maximum, Math.max(0, Math.floor(amountRmb))),
      },
    })
  },

  setFoodLifestyle: (foodLifestyle) => {
    const state = get()
    if (state.screen !== 'monthly-cycle' || !state.monthlyPlan) return
    const monthlyPlan = { ...state.monthlyPlan, foodLifestyle }
    const maximum = getMaximumExtraPaymentRmb(state.stats, monthlyPlan)
    set({
      monthlyPlan: {
        ...monthlyPlan,
        extraPaymentRmb: Math.min(monthlyPlan.extraPaymentRmb, maximum),
      },
    })
  },

  completeMonth: () => {
    const state = get()
    if (state.screen !== 'monthly-cycle') return
    const monthlyPlan = currentMonthlyPlan(state)
    const result = settleMonth(state.stats, {
      elapsedMonth: state.progress.elapsedMonths,
      year: state.year,
      month: state.month,
    }, monthlyPlan, state.livingProfile)
    const progress = {
      ...state.progress,
      debtClearedMonth: result.stats.debtRmb <= 0 && state.progress.debtClearedMonth === null
        ? state.progress.elapsedMonths
        : state.progress.debtClearedMonth,
    }
    const settledState: GameSaveState = {
      ...state,
      stats: result.stats,
      livingProfile: result.livingProfile,
      monthlySettlements: [...state.monthlySettlements, result.settlement],
      progress,
    }
    set({
      stats: settledState.stats,
      livingProfile: settledState.livingProfile,
      monthlySettlements: settledState.monthlySettlements,
      progress: settledState.progress,
      monthlyPlan: null,
      screen: 'month-settlement',
    })
    trackEvent('month_complete', { month: state.progress.elapsedMonths })
  },

  continueAfterMonthSettlement: () => {
    const state = get()
    if (state.screen !== 'month-settlement') return
    set(transitionAfterMonth(state))
  },

  completeAnnualReport: () => {
    const state = get()
    if (state.screen !== 'annual-report') return
    const progressedState: GameSaveState = {
      ...state,
      progress: {
        ...state.progress,
        phase: 'normal',
        completedAnnualReportYears: addUnique(
          state.progress.completedAnnualReportYears.map(String),
          ['1'],
        ).map(Number),
      },
    }
    set({ progress: progressedState.progress, ...transitionAfterMonth(progressedState) })
  },

  continueAfterStageEnding: () => {
    const state = get()
    if (state.screen !== 'stage-ending') return
    const deadline = state.progress.stageDeadlineMonths
    const progressedState: GameSaveState = {
      ...state,
      progress: {
        ...state.progress,
        phase: 'normal',
        stageEnding: null,
        resolvedStageEndingMonths: addUnique(
          state.progress.resolvedStageEndingMonths.map(String),
          [String(deadline)],
        ).map(Number),
      },
    }
    set(nextMonthlyCycle(progressedState))
  },

  chooseMonthlyMiniGameOption: (optionId) => {
    const state = get()
    if (
      state.screen !== 'monthly-minigame'
      || !state.activeMiniGame
      || state.activeMiniGame.result
      || state.monthlyEventSlot?.status !== 'mini_game_pending'
    ) return
    const config = miniGameConfigs.get(state.activeMiniGame.configId)
    if (!config) return
    const now = new Date()
    const expired = state.activeMiniGame.deadlineAt !== null
      && now.getTime() >= new Date(state.activeMiniGame.deadlineAt).getTime()
    const answerId = expired ? MINI_GAME_TIMEOUT_ANSWER : optionId
    const activeMiniGame = answerMiniGameStage(state.activeMiniGame, config, answerId, now)
    if (answerId === MINI_GAME_TIMEOUT_ANSWER) {
      trackEvent('minigame_timeout', { configId: config.id, stageIndex: state.activeMiniGame.stageIndex })
    } else {
      trackEvent('minigame_choice', { configId: config.id, stageIndex: state.activeMiniGame.stageIndex, optionId })
    }
    const applied = activeMiniGame.result ? applyMiniGameResult(state, activeMiniGame.result) : state
    set({
      stats: applied.stats,
      flags: applied.flags,
      activeMiniGame,
    })
  },

  timeoutMonthlyMiniGame: () => {
    const state = get()
    if (
      state.screen !== 'monthly-minigame'
      || !state.activeMiniGame
      || state.activeMiniGame.result
      || state.monthlyEventSlot?.status !== 'mini_game_pending'
    ) return
    const config = miniGameConfigs.get(state.activeMiniGame.configId)
    if (!config) return
    const activeMiniGame = answerMiniGameStage(
      state.activeMiniGame,
      config,
      MINI_GAME_TIMEOUT_ANSWER,
      new Date(),
    )
    const applied = activeMiniGame.result ? applyMiniGameResult(state, activeMiniGame.result) : state
    set({ stats: applied.stats, flags: applied.flags, activeMiniGame })
    trackEvent('minigame_timeout', { configId: config.id, stageIndex: state.activeMiniGame.stageIndex })
  },

  continueAfterMonthlyMiniGame: () => {
    const state = get()
    if (
      state.screen !== 'monthly-minigame'
      || !state.activeMiniGame?.result
      || state.monthlyEventSlot?.status !== 'mini_game_pending'
    ) return
    set({
      screen: 'monthly-cycle',
      activeMiniGame: null,
      monthlyEventSlot: completeMonthlyMiniGameSlot(state.monthlyEventSlot),
    })
    trackEvent('minigame_complete', {
      configId: state.activeMiniGame.configId,
      grade: state.activeMiniGame.result.grade,
      score: state.activeMiniGame.result.score,
    })
  },

  chooseDebtFreeMonth: (optionId) => {
    const state = get()
    const effects = debtFreeChoices[optionId]
    if (state.screen !== 'debt-free-month' || !effects) return
    set({
      stats: applyEffects(state.stats, effects),
      debtFreeChoiceId: optionId,
      screen: 'debt-free-scene',
      progress: { ...state.progress, debtFreeMonthCompleted: true },
    })
  },

  completeDebtFreeScene: () => {
    const state = get()
    if (state.screen !== 'debt-free-scene' || !state.progress.debtFreeMonthCompleted) return
    const finalEnding = resolveFinalEnding(state) ?? 'debt_free'
    set({
      screen: 'final-ending',
      progress: { ...state.progress, phase: 'final_ending', finalEnding },
    })
    trackEvent('ending_reached', { kind: 'final', endingId: finalEnding })
  },

  simulateFinalEnding: (endingId) => {
    const state = createEndingDebugState(get(), endingId)
    const finalEnding = resolveFinalEnding(state)
    if (!finalEnding) return
    set({
      ...state,
      screen: 'final-ending',
      progress: { ...state.progress, phase: 'final_ending', finalEnding },
    })
    trackEvent('ending_reached', { kind: 'debug', endingId: finalEnding })
  },
}), {
  name: SAVE_KEY,
  version: 9,
  storage: createJSONStorage(() => window.localStorage),
  migrate: migrateGameSave,
  partialize: (state): GameSaveState => ({
    language: state.language,
    screen: state.screen,
    month: state.month,
    year: state.year,
    stats: state.stats,
    flags: state.flags,
    completedEventIds: state.completedEventIds,
    history: state.history,
    currentEventId: state.currentEventId,
    resolution: state.resolution,
    startedAt: state.startedAt,
    progress: state.progress,
    activeMiniGame: state.activeMiniGame,
    monthlyEventSlot: state.monthlyEventSlot,
    sideHustles: state.sideHustles,
    employment: state.employment,
    livingProfile: state.livingProfile,
    monthlyPlan: state.monthlyPlan,
    monthlySettlements: state.monthlySettlements,
    debtFreeChoiceId: state.debtFreeChoiceId,
  }),
}))
