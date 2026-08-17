import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import { applyMiniGameResult } from './minigameResolver'

describe('applyMiniGameResult', () => {
  it('applies effects through the shared engine and adds flags once', () => {
    const result = applyMiniGameResult(
      { stats: { ...initialGameStats }, flags: ['existing'] },
      {
        grade: 'B',
        effects: { actionPoints: -10, workplace: 3, mental: -2 },
        flags: ['existing', 'read_air_completed'],
      },
    )

    expect(result.stats.actionPoints).toBe(-3)
    expect(result.stats.workplace).toBe(initialGameStats.workplace + 3)
    expect(result.flags).toEqual(['existing', 'read_air_completed'])
  })
})
