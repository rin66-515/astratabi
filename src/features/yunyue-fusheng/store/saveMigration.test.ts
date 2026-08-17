import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import { migrateGameSave } from './saveMigration'

describe('migrateGameSave', () => {
  it('preserves a v1 playthrough and supplies all current defaults', () => {
    const migrated = migrateGameSave({
      language: 'ja',
      screen: 'event',
      month: 8,
      year: 2024,
      stats: {
        ...initialGameStats,
        minimumPaymentRmb: undefined,
        debtInterestRate: undefined,
        cashJpy: 211_000,
      },
      flags: ['planned_evening_study'],
      completedEventIds: ['main-00-arrival'],
      history: [],
      currentEventId: 'main-01-empty-room',
      resolution: null,
      startedAt: '2026-08-17T00:00:00.000Z',
    }, 1)

    expect(migrated.language).toBe('ja')
    expect(migrated.stats.cashJpy).toBe(211_000)
    expect(migrated.stats.minimumPaymentRmb).toBe(initialGameStats.minimumPaymentRmb)
    expect(migrated.stats.debtInterestRate).toBe(initialGameStats.debtInterestRate)
    expect(migrated.progress.stageDeadlineMonths).toBe(18)
    expect(migrated.progress.elapsedMonths).toBe(1)
    expect(migrated.activeMiniGame).toBeNull()
    expect(migrated.monthlyPlan).toBeNull()
    expect(migrated.monthlySettlements).toEqual([])
    expect(migrated.debtFreeChoiceId).toBeNull()
    expect(migrated.currentEventId).toBe('main-01-empty-room')
  })

  it('falls back safely when persisted data is unusable', () => {
    const migrated = migrateGameSave('broken', 1)
    expect(migrated.language).toBe('zh')
    expect(migrated.currentEventId).toBe('main-00-arrival')
    expect(migrated.stats.debtRmb).toBe(100_000)
  })

  it('keeps a v3 monthly-cycle save playable and prepares its plan after hydration', () => {
    const migrated = migrateGameSave({
      ...migrateGameSave({}, 1),
      screen: 'monthly-cycle',
      month: 9,
      year: 2024,
      monthlyPlan: undefined,
    }, 3)

    expect(migrated.screen).toBe('monthly-cycle')
    expect(migrated.monthlyPlan).toBeNull()
    expect(migrated.stats.exchangeRate).toBe(initialGameStats.exchangeRate)
  })
})
