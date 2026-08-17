import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import { readTheAirConfig } from '../data/miniGames'
import {
  answerMiniGameStage,
  applyMiniGameResult,
  createMiniGameSession,
  MINI_GAME_TIMEOUT_ANSWER,
} from './minigameResolver'

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

  it('runs three timed stages into an S result', () => {
    let session = createMiniGameSession(
      'monthly-work-read-the-air',
      readTheAirConfig,
      new Date('2026-08-18T00:00:00.000Z'),
    )
    expect(session.deadlineAt).toBe('2026-08-18T00:00:12.000Z')

    session = answerMiniGameStage(session, readTheAirConfig, 'confirm-decision', new Date('2026-08-18T00:00:02.000Z'))
    expect(session.stageIndex).toBe(1)
    expect(session.deadlineAt).toBe('2026-08-18T00:00:12.000Z')
    session = answerMiniGameStage(session, readTheAirConfig, 'confirm-owner-and-done', new Date('2026-08-18T00:00:04.000Z'))
    session = answerMiniGameStage(session, readTheAirConfig, 'summarize-and-leave', new Date('2026-08-18T00:00:06.000Z'))

    expect(session.result).toMatchObject({ score: 9, grade: 'S' })
    expect(session.deadlineAt).toBeNull()
  })

  it('treats each timeout as a valid answer and reaches D', () => {
    let session = createMiniGameSession('monthly-work-read-the-air', readTheAirConfig)
    session = answerMiniGameStage(session, readTheAirConfig, MINI_GAME_TIMEOUT_ANSWER)
    session = answerMiniGameStage(session, readTheAirConfig, MINI_GAME_TIMEOUT_ANSWER)
    session = answerMiniGameStage(session, readTheAirConfig, MINI_GAME_TIMEOUT_ANSWER)

    expect(session.answers).toEqual({
      'meeting-close': MINI_GAME_TIMEOUT_ANSWER,
      'morning-review': MINI_GAME_TIMEOUT_ANSWER,
      'leave-or-stay': MINI_GAME_TIMEOUT_ANSWER,
    })
    expect(session.result).toMatchObject({ grade: 'D', score: 0 })
  })
})
