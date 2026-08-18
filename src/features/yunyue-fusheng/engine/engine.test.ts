import { describe, expect, it } from 'vitest'
import { firstMonthEvents } from '../data/events/firstMonth'
import { createInitialSideHustleState, initialGameStats, initialLivingProfile } from '../data/initialState'
import type { EventContext, GameEvent } from '../types/game'
import { applyEffects } from './applyEffects'
import { checkCondition } from './checkCondition'
import { getAvailableEvents, pickNextStoryEvent, pickWeightedEvent } from './eventSelection'

function context(overrides: Partial<EventContext> = {}): EventContext {
  return {
    month: 8,
    elapsedMonth: 1,
    stats: { ...initialGameStats },
    flags: [],
    completedEventIds: [],
    sideHustles: createInitialSideHustleState(),
    livingProfile: { ...initialLivingProfile },
    ...overrides,
  }
}

describe('applyEffects', () => {
  it('allows action point overdraft while clamping bounded states', () => {
    const result = applyEffects(initialGameStats, { actionPoints: -12, health: 80, stress: -80 })
    expect(result.actionPoints).toBe(-5)
    expect(result.health).toBe(100)
    expect(result.stress).toBe(0)
  })

  it('does not allow debt to fall below zero', () => {
    expect(applyEffects(initialGameStats, { debtRmb: -120_000 }).debtRmb).toBe(0)
  })
})

describe('checkCondition', () => {
  it('supports story, elapsed-month and side-hustle conditions', () => {
    const sideHustles = createInitialSideHustleState()
    sideHustles.routes.freelance.completedActions = 2
    const state = context({
      elapsedMonth: 6,
      flags: ['planned_evening_study'],
      completedEventIds: ['main-03-impact-check'],
      sideHustles,
    })
    expect(checkCondition({ type: 'stat', stat: 'stress', operator: 'gte', value: 30 }, state)).toBe(true)
    expect(checkCondition({ type: 'flag', flag: 'planned_evening_study' }, state)).toBe(true)
    expect(checkCondition({ type: 'completedEvent', eventId: 'main-03-impact-check' }, state)).toBe(true)
    expect(checkCondition({ type: 'month', operator: 'eq', value: 8 }, state)).toBe(true)
    expect(checkCondition({ type: 'elapsedMonth', operator: 'gte', value: 6 }, state)).toBe(true)
    expect(checkCondition({ type: 'sideHustle', routeId: 'freelance', field: 'completedActions', operator: 'gte', value: 2 }, state)).toBe(true)
  })
})

describe('event selection', () => {
  it('keeps the evening study event unavailable without its causal flag', () => {
    const available = getAvailableEvents(firstMonthEvents, context({ completedEventIds: firstMonthEvents.slice(0, 8).map((event) => event.id) }))
    expect(available.map((event) => event.id)).toEqual(['main-09-month-end'])
  })

  it('unlocks the evening study event when the earlier promise flag exists', () => {
    const state = context({
      flags: ['planned_evening_study'],
      completedEventIds: firstMonthEvents.slice(0, 8).map((event) => event.id),
    })
    expect(pickNextStoryEvent(firstMonthEvents, state)?.id).toBe('main-08-evening-study')
  })

  it('uses weights with an injectable random source', () => {
    const events: GameEvent[] = [
      { id: 'light', title: { zh: '', ja: '' }, category: 'life', text: [], weight: 1, options: [] },
      { id: 'heavy', title: { zh: '', ja: '' }, category: 'life', text: [], weight: 3, options: [] },
    ]
    expect(pickWeightedEvent(events, () => 0)?.id).toBe('light')
    expect(pickWeightedEvent(events, () => 0.99)?.id).toBe('heavy')
  })
})
