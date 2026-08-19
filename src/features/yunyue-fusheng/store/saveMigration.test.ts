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
    expect(migrated.monthlyEventSlot).toBeNull()
    expect(migrated.sideHustles.totalIncomeJpy).toBe(0)
    expect(migrated.employment.baseSalaryJpy).toBe(initialGameStats.salaryJpy)
    expect(migrated.livingProfile).toMatchObject({ foodLifestyle: 'frugal', smokingLevel: 'regular' })
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

  it('adds an empty side hustle state to a v4 save without changing its play state', () => {
    const source = migrateGameSave({}, 1)
    const migrated = migrateGameSave({
      ...source,
      screen: 'monthly-cycle',
      month: 10,
      year: 2024,
      sideHustles: undefined,
    }, 4)

    expect(migrated.screen).toBe('monthly-cycle')
    expect(migrated.month).toBe(10)
    expect(migrated.sideHustles.totalIncomeJpy).toBe(0)
    expect(migrated.sideHustles.routes.own_product.unlockedAtMonth).toBeNull()
  })

  it('adds no monthly event to an existing v5 save and preserves a v6 slot contract', () => {
    const source = migrateGameSave({}, 1)
    expect(migrateGameSave({ ...source, monthlyEventSlot: undefined }, 5).monthlyEventSlot).toBeNull()

    const migrated = migrateGameSave({
      ...source,
      screen: 'monthly-minigame',
      monthlyEventSlot: {
        elapsedMonth: 6,
        kind: 'minigame',
        eventId: 'monthly-read-air',
        status: 'mini_game_pending',
        miniGame: { type: 'read_the_air', configId: 'read-air-v1' },
      },
    }, 6)

    expect(migrated.screen).toBe('monthly-cycle')
    expect(migrated.monthlyEventSlot?.status).toBe('completed')
    expect(migrated.monthlyEventSlot?.miniGame?.configId).toBe('read-air-v1')
  })

  it('preserves a v7 negative AP plan and supplies consequence defaults to older settlements', () => {
    const source = migrateGameSave({}, 1)
    const migrated = migrateGameSave({
      ...source,
      monthlyPlan: {
        elapsedMonth: 4,
        year: 2024,
        month: 11,
        openingCashJpy: 100_000,
        actionPointsGranted: 6,
        actionPointsRemaining: -2,
        exchangeRate: 0.048,
        selectedActions: [],
        extraPaymentRmb: 0,
      },
      monthlySettlements: [{
        elapsedMonth: 3,
        year: 2024,
        month: 10,
        actionPointsGranted: 6,
        actionPointsSpent: 3,
        fixedExpenses: [
          { id: 'food', amountJpy: 42_000 },
          { id: 'transport_daily', amountJpy: 13_000 },
        ],
        actions: [],
      }],
    }, 7)

    expect(migrated.monthlyPlan?.actionPointsRemaining).toBe(-2)
    expect(migrated.monthlySettlements[0]).toMatchObject({
      actionIntensity: 0.5,
      actionPointsOverdrawn: 0,
      negativeActionPointMonth: false,
      consequenceEffects: {},
      foodCostJpy: 42_000,
    })
    expect(migrated.monthlySettlements[0].fixedExpenses.map((expense) => expense.id))
      .toEqual(['food', 'transport'])
  })

  it('preserves an in-progress v8 minigame deadline and answers', () => {
    const source = migrateGameSave({}, 1)
    const migrated = migrateGameSave({
      ...source,
      screen: 'monthly-minigame',
      activeMiniGame: {
        eventId: 'monthly-work-read-the-air',
        configId: 'read-the-air-v1',
        type: 'read_the_air',
        stageIndex: 1,
        answers: { 'meeting-close': 'confirm-decision' },
        stageStartedAt: '2026-08-18T00:00:02.000Z',
        deadlineAt: '2026-08-18T00:00:12.000Z',
        result: null,
      },
    }, 8)

    expect(migrated.activeMiniGame).toMatchObject({
      stageIndex: 1,
      answers: { 'meeting-close': 'confirm-decision' },
      deadlineAt: '2026-08-18T00:00:12.000Z',
      result: null,
    })
    expect(migrated.employment.baseSalaryJpy).toBe(initialGameStats.salaryJpy)
    expect(migrated.livingProfile.foodLifestyle).toBe('frugal')
  })

  it('preserves v9 employment, lifestyle and dynamic settlement details', () => {
    const source = migrateGameSave({}, 1)
    const migrated = migrateGameSave({
      ...source,
      employment: {
        ...source.employment,
        baseSalaryJpy: 270_000,
        mentorAllowanceJpy: 8_000,
        isMentoringJunior: true,
        lastSalaryReviewMonth: 12,
      },
      livingProfile: {
        ...source.livingProfile,
        foodLifestyle: 'balanced',
        consecutiveFoodLifestyleMonths: 3,
        stressSmokingCount: 2,
      },
    }, 9)

    expect(migrated.employment).toMatchObject({
      baseSalaryJpy: 270_000,
      mentorAllowanceJpy: 8_000,
      isMentoringJunior: true,
      lastSalaryReviewMonth: 12,
    })
    expect(migrated.livingProfile).toMatchObject({
      foodLifestyle: 'balanced',
      consecutiveFoodLifestyleMonths: 3,
      stressSmokingCount: 2,
    })
  })

  it('maps a legacy unlocked route to v10 without relocking it', () => {
    const source = migrateGameSave({}, 1)
    const migrated = migrateGameSave({
      ...source,
      eventOccurrences: { 'monthly-finance-extra-income-thought': [2, 5] },
      sideHustles: {
        totalIncomeJpy: 12_000,
        routes: {
          ...source.sideHustles.routes,
          freelance: {
            unlockedAtMonth: 3,
            level: 1,
            experience: 2,
            totalIncomeJpy: 12_000,
            completedActions: 1,
          },
        },
      },
      monthlyPlan: {
        elapsedMonth: 5,
        year: 2024,
        month: 12,
        openingCashJpy: 100_000,
        actionPointsGranted: 6,
        actionPointsRemaining: 4,
        exchangeRate: 0.048,
        selectedActions: [],
        extraPaymentRmb: 0,
      },
    }, 9)

    expect(migrated.sideHustles.routes.freelance).toMatchObject({
      state: 'unlocked',
      discoveredAtMonth: 3,
      unlockedAtMonth: 3,
      level: 1,
    })
    expect(migrated.sideHustles.discovery.state).toBe('discovered')
    expect(migrated.eventOccurrences['monthly-finance-extra-income-thought']).toEqual([2, 5])
    expect(migrated.monthlyPlan?.actionAvailability).toEqual([])
  })
})
