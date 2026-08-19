import { describe, expect, it } from 'vitest'
import { createInitialSideHustleState, initialGameStats } from '../data/initialState'
import { getAvailableMonthlyActions } from '../data/monthlyActions'
import { createMonthlyPlan } from './monthPlanning'
import {
  grantMonthlyAction,
  isMonthlyActionAvailable,
  resolveMonthlyActionAvailability,
} from './monthlyActionAvailability'

describe('monthly action availability', () => {
  const context = {
    elapsedMonth: 4,
    stats: { ...initialGameStats },
    flags: [],
    sideHustles: createInitialSideHustleState(),
  }

  it('keeps rest available while severe pressure can close other actions for one month', () => {
    const pressured = {
      ...context,
      stats: { ...context.stats, health: 20, mental: 20, stress: 90, recoveryDebt: 85 },
    }
    const actions = getAvailableMonthlyActions(pressured)
    const availability = resolveMonthlyActionAvailability(actions, pressured, 2, () => 0.99)

    expect(availability.find((entry) => entry.actionId === 'rest')?.status).toBe('available')
    expect(availability.find((entry) => entry.actionId === 'study_tech')).toMatchObject({
      status: 'unavailable',
      reason: { zh: '身体只够应付必要的事情。' },
    })
  })

  it('stores a temporary event grant without rerolling the rest of the month', () => {
    const base = createMonthlyPlan(context.stats, { elapsedMonth: 4, year: 2024, month: 11 }, () => 0)
    const plan = {
      ...base,
      actionAvailability: resolveMonthlyActionAvailability(
        getAvailableMonthlyActions(context),
        context,
        base.actionPointsGranted,
        () => 0.99,
      ),
    }
    const before = plan.actionAvailability.filter((entry) => entry.actionId !== 'study_tech')
    const granted = grantMonthlyAction(plan, {
      actionId: 'study_tech',
      reason: { zh: '忽然想弄明白一个问题。', ja: 'ふと、一つの疑問を確かめたくなった。' },
    }, 'test-inspiration')

    expect(granted && isMonthlyActionAvailable(granted, 'study_tech')).toBe(true)
    expect(granted?.actionAvailability.find((entry) => entry.actionId === 'study_tech')).toMatchObject({
      status: 'temporary',
      sourceEventId: 'test-inspiration',
    })
    expect(granted?.actionAvailability.filter((entry) => entry.actionId !== 'study_tech')).toEqual(before)
  })

  it('treats a legacy in-progress monthly plan without a snapshot as available', () => {
    const plan = createMonthlyPlan(context.stats, { elapsedMonth: 4, year: 2024, month: 11 }, () => 0)
    expect(isMonthlyActionAvailable(plan, 'rest')).toBe(true)
  })
})
