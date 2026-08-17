import { describe, expect, it } from 'vitest'
import { createInitialSideHustleState, initialGameStats } from '../data/initialState'
import type { MonthlyActionContext, SideHustleRouteId, SideHustleState } from '../types/game'
import {
  applySideHustleOutcome,
  isSideHustleUnlockEligible,
  sideHustleMonthlyActionProvider,
  unlockEligibleSideHustles,
} from './sideHustleResolver'

function context(overrides: Partial<MonthlyActionContext> = {}): MonthlyActionContext {
  const sideHustles = overrides.sideHustles ?? createInitialSideHustleState()
  return {
    elapsedMonth: 2,
    flags: [],
    ...overrides,
    stats: { ...initialGameStats, ...overrides.stats },
    sideHustles,
  }
}

function unlockedState(levels: Partial<Record<SideHustleRouteId, number>>): SideHustleState {
  const state = createInitialSideHustleState()
  for (const [routeId, level] of Object.entries(levels) as [SideHustleRouteId, number][]) {
    state.routes[routeId] = { ...state.routes[routeId], unlockedAtMonth: 2, level }
  }
  return state
}

describe('side hustle routes', () => {
  it('unlocks content in month 2 and keeps unlocked routes permanent', () => {
    const initial = createInitialSideHustleState()
    const unlocked = unlockEligibleSideHustles(initial, context())
    expect(unlocked.routes.content_account.unlockedAtMonth).toBe(2)
    expect(unlocked.routes.freelance.unlockedAtMonth).toBeNull()

    const afterStatsDrop = unlockEligibleSideHustles(unlocked, context({
      elapsedMonth: 3,
      stats: { ...initialGameStats, japanese: 10 },
      sideHustles: unlocked,
    }))
    expect(afterStatsDrop.routes.content_account.unlockedAtMonth).toBe(2)
  })

  it('enforces each route unlock condition', () => {
    expect(isSideHustleUnlockEligible('freelance', context({ stats: { ...initialGameStats, tech: 40 } }))).toBe(true)
    expect(isSideHustleUnlockEligible('it_materials', context({ stats: { ...initialGameStats, tech: 38, workplace: 32 } }))).toBe(true)
    expect(isSideHustleUnlockEligible('own_product', context({ elapsedMonth: 4, stats: { ...initialGameStats, product: 20 } }))).toBe(false)
    expect(isSideHustleUnlockEligible('own_product', context({ elapsedMonth: 5, stats: { ...initialGameStats, product: 20 } }))).toBe(true)
  })

  it('provides AP, income, growth and stress costs for an unlocked route', () => {
    const actions = sideHustleMonthlyActionProvider(context())
    const content = actions.find((action) => action.sideHustle?.routeId === 'content_account')
    expect(content?.actionPointCost).toBe(2)
    expect(content?.sideHustle).toEqual({ routeId: 'content_account', experience: 3, incomeJpy: 2_000 })
    expect(content?.effects).toMatchObject({ cashJpy: 2_000, product: 1, stress: 3, socialBattery: -4 })
  })

  it('provides the confirmed base contract for all four routes', () => {
    const sideHustles = unlockedState({ freelance: 0, it_materials: 0, content_account: 0, own_product: 0 })
    const actions = sideHustleMonthlyActionProvider(context({ elapsedMonth: 5, sideHustles }))
    const byRoute = Object.fromEntries(actions.map((action) => [action.sideHustle?.routeId, action]))

    expect(byRoute.freelance).toMatchObject({ actionPointCost: 3, sideHustle: { incomeJpy: 12_000 }, effects: { stress: 5, mental: -2 } })
    expect(byRoute.it_materials).toMatchObject({ actionPointCost: 2, sideHustle: { incomeJpy: 6_000 }, effects: { product: 2, stress: 2 } })
    expect(byRoute.content_account).toMatchObject({ actionPointCost: 2, sideHustle: { incomeJpy: 2_000 }, effects: { stress: 3, socialBattery: -4 } })
    expect(byRoute.own_product).toMatchObject({ actionPointCost: 3, sideHustle: { incomeJpy: 4_000 }, effects: { product: 3, health: -1 } })
  })

  it('applies cross-route synergy without changing the core monthly action contract', () => {
    const sideHustles = unlockedState({ freelance: 2, it_materials: 2, content_account: 2, own_product: 2 })
    const actions = sideHustleMonthlyActionProvider(context({ elapsedMonth: 6, sideHustles }))
    const product = actions.find((action) => action.sideHustle?.routeId === 'own_product')
    const content = actions.find((action) => action.sideHustle?.routeId === 'content_account')
    expect(product?.actionPointCost).toBe(2)
    expect(product?.sideHustle?.incomeJpy).toBe(19_200)
    expect(product?.sideHustle?.experience).toBe(5)
    expect(content?.sideHustle?.experience).toBe(4)
  })

  it('levels a route and records cumulative income', () => {
    const state = unlockedState({ content_account: 0 })
    const progressed = applySideHustleOutcome(state, {
      routeId: 'content_account',
      experience: 6,
      incomeJpy: 2_000,
    }, 2)
    expect(progressed.routes.content_account.level).toBe(1)
    expect(progressed.routes.content_account.experience).toBe(0)
    expect(progressed.routes.content_account.totalIncomeJpy).toBe(2_000)
    expect(progressed.totalIncomeJpy).toBe(2_000)
  })
})
