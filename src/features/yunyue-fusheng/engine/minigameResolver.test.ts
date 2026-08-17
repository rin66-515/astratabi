import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import { designReviewConfig, incidentResponseConfig, miniGameConfigs, readTheAirConfig } from '../data/miniGames'
import {
  answerMiniGameStage,
  applyMiniGameResult,
  createMiniGameSession,
  MINI_GAME_TIMEOUT_ANSWER,
  resolveMiniGameResult,
} from './minigameResolver'

describe('applyMiniGameResult', () => {
  it('keeps every playable config bilingual, timed and grounded by a realistic option', () => {
    expect(miniGameConfigs.size).toBe(3)
    for (const config of miniGameConfigs.values()) {
      expect(config.title.zh.length).toBeGreaterThan(0)
      expect(config.title.ja.length).toBeGreaterThan(0)
      expect(config.stages).toHaveLength(3)
      for (const stage of config.stages) {
        expect(stage.timeLimitMs).toBeGreaterThan(0)
        expect(stage.timeout?.resultText.zh.length).toBeGreaterThan(0)
        expect(stage.timeout?.resultText.ja.length).toBeGreaterThan(0)
        expect(stage.options.some((option) => option.tone === 'realistic')).toBe(true)
      }
    }
  })

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

  it.each([
    [incidentResponseConfig, 'incident_response_controlled'],
    [designReviewConfig, 'design_review_traceable'],
  ])('resolves every completed framework config through its own result profile', (config, expectedFlag) => {
    const bestAnswers = Object.fromEntries(config.stages.map((stage) => [stage.id, stage.options[0].id]))
    const result = resolveMiniGameResult(config, bestAnswers)

    expect(result).toMatchObject({ score: 9, grade: 'S' })
    expect(result.flags).toContain(expectedFlag)
  })
})
