import { describe, expect, it } from 'vitest'
import { initialGameStats, initialLivingProfile } from '../data/initialState'
import { advanceLivingProfile, applyLivingEffects, resolveLivingExpenses } from './livingCostResolver'

describe('dynamic living cost', () => {
  it('keeps frugal food at 42,000 and itemizes regular smoking', () => {
    const expenses = resolveLivingExpenses('frugal', 'regular')
    expect(expenses.find((item) => item.id === 'food')?.amountJpy).toBe(42_000)
    expect(expenses.find((item) => item.id === 'smoking')?.amountJpy).toBe(16_000)
    expect(expenses.reduce((total, item) => total + item.amountJpy, 0)).toBe(166_000)
  })

  it('makes survival cheaper with recovery trade-offs and balanced food restorative', () => {
    const survival = applyLivingEffects(initialGameStats, 'survival', 'none')
    const balanced = applyLivingEffects(initialGameStats, 'balanced', 'none')
    expect(survival.health).toBeLessThan(initialGameStats.health)
    expect(survival.lifePoverty).toBeGreaterThan(initialGameStats.lifePoverty)
    expect(balanced.health).toBeGreaterThan(initialGameStats.health)
    expect(balanced.lifePoverty).toBeLessThan(initialGameStats.lifePoverty)
  })

  it('tracks consecutive months only while the same lifestyle continues', () => {
    const first = advanceLivingProfile(initialLivingProfile, 'survival', 'regular')
    const second = advanceLivingProfile(first, 'survival', 'regular')
    const changed = advanceLivingProfile(second, 'balanced', 'regular')
    expect(second.consecutiveFoodLifestyleMonths).toBe(2)
    expect(changed.consecutiveFoodLifestyleMonths).toBe(1)
  })
})
