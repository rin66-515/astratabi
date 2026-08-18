import { describe, expect, it } from 'vitest'
import { createInitialSideHustleState, initialGameStats, initialLivingProfile } from '../data/initialState'
import type { EventContext, GameEvent, MonthlyEventDefinition } from '../types/game'
import { completeMonthlyEventSlot, completeMonthlyMiniGameSlot, selectMonthlyEventSlot } from './monthlyEventSlot'

const context: EventContext = {
  month: 9,
  elapsedMonth: 2,
  stats: initialGameStats,
  flags: [],
  completedEventIds: [],
  sideHustles: createInitialSideHustleState(),
  livingProfile: { ...initialLivingProfile },
}

function event(id: string, weight = 1): GameEvent {
  return {
    id,
    title: { zh: id, ja: id },
    category: 'life',
    text: [{ zh: id, ja: id }],
    weight,
    options: [{ id: 'continue', label: { zh: '继续', ja: '続ける' } }],
  }
}

describe('monthly event slot', () => {
  it('returns a persistent empty marker when no event is registered', () => {
    expect(selectMonthlyEventSlot([], context, 2, () => 0)).toEqual({
      elapsedMonth: 2,
      kind: null,
      eventId: null,
      status: 'none',
      miniGame: null,
    })
  })

  it('prioritizes a Major Event over normal weighted events', () => {
    const definitions: MonthlyEventDefinition[] = [
      { kind: 'normal', event: event('normal', 100) },
      { kind: 'major', event: event('major', 1) },
    ]

    const slot = selectMonthlyEventSlot(definitions, context, 2, () => 0.99)
    expect(slot.eventId).toBe('major')
    expect(completeMonthlyEventSlot(slot).status).toBe('completed')
  })

  it('keeps a minigame trigger pending until its result is supplied', () => {
    const miniGameEvent = {
      ...event('read-air'),
      miniGame: { type: 'read_the_air' as const, configId: 'read-air-v1' },
    }
    const slot = selectMonthlyEventSlot([{ kind: 'minigame', event: miniGameEvent }], context, 3)
    const waiting = completeMonthlyEventSlot(slot)

    expect(waiting.status).toBe('mini_game_pending')
    expect(waiting.miniGame).toEqual(miniGameEvent.miniGame)
    expect(completeMonthlyMiniGameSlot(waiting).status).toBe('completed')
  })

  it('rejects a minigame slot without a trigger contract', () => {
    expect(() => selectMonthlyEventSlot([{ kind: 'minigame', event: event('broken') }], context, 4))
      .toThrow('requires a miniGame trigger')
  })

  it('raises future event weight when a state condition is met', () => {
    const definitions: MonthlyEventDefinition[] = [
      { kind: 'normal', event: event('neutral') },
      {
        kind: 'normal',
        event: event('pressure'),
        weightRules: [{
          conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 70 }],
          multiplier: 4,
        }],
      },
    ]

    expect(selectMonthlyEventSlot(definitions, context, 4, () => 0.3).eventId).toBe('neutral')
    expect(selectMonthlyEventSlot(definitions, {
      ...context,
      stats: { ...context.stats, stress: 80 },
    }, 4, () => 0.3).eventId).toBe('pressure')
  })
})
