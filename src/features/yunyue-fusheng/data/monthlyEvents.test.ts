import { describe, expect, it } from 'vitest'
import { createInitialSideHustleState, initialGameStats } from './initialState'
import { miniGamePlaceholders } from './miniGames'
import { monthlyEventDefinitions } from './monthlyEvents'
import { getAvailableEvents } from '../engine/eventSelection'

describe('formal monthly event content', () => {
  it('ships 15 bilingual events with at least one realistic option each', () => {
    expect(monthlyEventDefinitions).toHaveLength(15)
    for (const { event } of monthlyEventDefinitions) {
      expect(event.title.zh.length).toBeGreaterThan(0)
      expect(event.title.ja.length).toBeGreaterThan(0)
      expect(event.text.every((line) => line.zh.length > 0 && line.ja.length > 0)).toBe(true)
      expect(event.options.some((option) => option.tone === 'realistic')).toBe(true)
    }
  })

  it('covers the requested content areas and keeps two future minigames as placeholders', () => {
    const categories = new Set(monthlyEventDefinitions.map(({ event }) => event.category))
    for (const category of ['work', 'health', 'life', 'institution', 'family', 'sidejob'] as const) {
      expect(categories.has(category)).toBe(true)
    }
    expect(miniGamePlaceholders).toEqual([
      { type: 'incident_response', configId: 'incident-response-placeholder', status: 'placeholder' },
      { type: 'design_review', configId: 'design-review-placeholder', status: 'placeholder' },
    ])
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
    }
    const events = monthlyEventDefinitions.map(({ event }) => event)
    expect(getAvailableEvents(events, baseContext).some((event) => event.category === 'sidejob')).toBe(false)

    sideHustles.routes.freelance.completedActions = 2
    expect(getAvailableEvents(events, { ...baseContext, sideHustles }).map((event) => event.id))
      .toContain('monthly-sidejob-freelance-revision')
  })
})
