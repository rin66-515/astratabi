import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { firstMonthEventMap, firstMonthEvents } from '../data/events/firstMonth'
import { initialGameStats } from '../data/initialState'
import { applyEffects } from '../engine/applyEffects'
import { checkConditions } from '../engine/checkCondition'
import { pickNextStoryEvent } from '../engine/eventSelection'
import type {
  ChoiceHistoryEntry,
  ChoiceResolution,
  EventContext,
  GameEffects,
  GameScreen,
  GameStats,
  Language,
} from '../types/game'
import { trackEvent } from '../utils/trackEvent'

const SAVE_KEY = 'astratabi:yunyue-fusheng:v1'

type PersistedGameState = {
  language: Language
  screen: GameScreen
  month: number
  year: number
  stats: GameStats
  flags: string[]
  completedEventIds: string[]
  history: ChoiceHistoryEntry[]
  currentEventId: string | null
  resolution: ChoiceResolution | null
  startedAt: string | null
}

type GameActions = {
  setLanguage: (language: Language) => void
  startNewGame: () => void
  beginMonth: () => void
  chooseOption: (optionId: string) => void
  advance: () => void
  showPreview: () => void
}

export type GameStore = PersistedGameState & GameActions

function initialState(language: Language): PersistedGameState {
  return {
    language,
    screen: 'event',
    month: 8,
    year: 2024,
    stats: { ...initialGameStats },
    flags: [],
    completedEventIds: [],
    history: [],
    currentEventId: 'main-00-arrival',
    resolution: null,
    startedAt: null,
  }
}

function mergeEffects(left: GameEffects, right: GameEffects = {}): GameEffects {
  const merged = { ...left }
  for (const [key, delta] of Object.entries(right)) {
    const stat = key as keyof GameStats
    merged[stat] = (merged[stat] ?? 0) + (delta ?? 0)
  }
  return merged
}

function contextOf(state: PersistedGameState, stats = state.stats, flags = state.flags): EventContext {
  return {
    month: state.month,
    stats,
    flags,
    completedEventIds: state.completedEventIds,
  }
}

function addUnique(values: string[], additions: string[] = []) {
  return [...new Set([...values, ...additions])]
}

export const useGameStore = create<GameStore>()(persist((set, get) => ({
  ...initialState('zh'),

  setLanguage: (language) => {
    set({ language })
    trackEvent('language_change', { language })
  },

  startNewGame: () => {
    const language = get().language
    set({ ...initialState(language), startedAt: new Date().toISOString() })
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
    const event = firstMonthEventMap.get(state.currentEventId)
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
    set({
      stats: nextStats,
      flags: nextFlags,
      completedEventIds,
      history,
      resolution: { eventId: event.id, optionId, effects: combinedEffects, response },
    })
    trackEvent('event_choice', { eventId: event.id, optionId })
  },

  advance: () => {
    const state = get()
    if (!state.currentEventId || !state.resolution) return
    const event = firstMonthEventMap.get(state.currentEventId)
    if (!event) return

    if (event.onComplete) {
      set({ screen: event.onComplete, currentEventId: null, resolution: null })
      if (event.onComplete === 'month-summary') trackEvent('month_complete', { month: state.month })
      return
    }

    const nextContext: EventContext = {
      month: state.month,
      stats: state.stats,
      flags: state.flags,
      completedEventIds: state.completedEventIds,
    }
    const nextEvent = pickNextStoryEvent(firstMonthEvents, nextContext)
    set({ currentEventId: nextEvent?.id ?? null, resolution: null })
  },

  showPreview: () => set({ screen: 'preview', currentEventId: null, resolution: null }),
}), {
  name: SAVE_KEY,
  version: 1,
  storage: createJSONStorage(() => window.localStorage),
  partialize: (state): PersistedGameState => ({
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
  }),
}))
