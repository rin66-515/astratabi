import { describe, expect, it } from 'vitest'
import { createInitialSideHustleState, initialGameStats, initialLivingProfile } from './initialState'
import { miniGameConfigs } from './miniGames'
import { monthlyEventDefinitions } from './monthlyEvents'
import { getAvailableEvents } from '../engine/eventSelection'

describe('formal monthly event content', () => {
  it('ships 19 bilingual events with at least one realistic option each', () => {
    expect(monthlyEventDefinitions).toHaveLength(19)
    for (const { event } of monthlyEventDefinitions) {
      expect(event.title.zh.length).toBeGreaterThan(0)
      expect(event.title.ja.length).toBeGreaterThan(0)
      expect(event.text.every((line) => line.zh.length > 0 && line.ja.length > 0)).toBe(true)
      expect(event.options.some((option) => option.tone === 'realistic')).toBe(true)
    }
  })

  it('covers the requested content areas and registers all three playable minigames', () => {
    const categories = new Set(monthlyEventDefinitions.map(({ event }) => event.category))
    for (const category of ['work', 'health', 'life', 'institution', 'family', 'sidejob'] as const) {
      expect(categories.has(category)).toBe(true)
    }
    expect([...miniGameConfigs.values()].map((config) => config.type).sort()).toEqual([
      'design_review', 'incident_response', 'read_the_air',
    ])
    expect(monthlyEventDefinitions.filter(({ kind }) => kind === 'minigame').map(({ event }) => event.miniGame?.type).sort())
      .toEqual(['design_review', 'incident_response', 'read_the_air'])
  })

  it('does not expose a side-hustle feedback event before its route has real activity', () => {
    const sideHustles = createInitialSideHustleState()
    const baseContext = {
      month: 1,
      elapsedMonth: 6,
      stats: initialGameStats,
      flags: [],
      completedEventIds: [],
      sideHustles,
      livingProfile: { ...initialLivingProfile },
    }
    const events = monthlyEventDefinitions.map(({ event }) => event)
    expect(getAvailableEvents(events, baseContext).some((event) => event.category === 'sidejob')).toBe(false)

    sideHustles.routes.freelance.completedActions = 2
    expect(getAvailableEvents(events, { ...baseContext, sideHustles }).map((event) => event.id))
      .toContain('monthly-sidejob-freelance-revision')
  })

  it('gates mentor, food warning and smoking events by real state', () => {
    const events = monthlyEventDefinitions.map(({ event }) => event)
    const baseContext = {
      month: 2,
      elapsedMonth: 6,
      stats: { ...initialGameStats, workTrust: 10, stress: 76, recoveryDebt: 30 },
      flags: [],
      completedEventIds: ['monthly-life-stress-smoking'],
      sideHustles: createInitialSideHustleState(),
      livingProfile: {
        ...initialLivingProfile,
        foodLifestyle: 'survival' as const,
        consecutiveFoodLifestyleMonths: 3,
      },
    }
    const available = getAvailableEvents(events, baseContext).map((event) => event.id)
    expect(available).toContain('monthly-work-mentor-assignment')
    expect(available).toContain('monthly-life-chain-smoking-day')
    expect(available).toContain('monthly-health-food-warning')
    expect(monthlyEventDefinitions.find(({ event }) => event.id === 'monthly-life-stress-smoking')
      ?.event.options.some((option) => option.monthlyCost?.category === 'smoking')).toBe(true)
  })
})
