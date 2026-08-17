import type {
  GameStats,
  MiniGameConfig,
  MiniGameGrade,
  MiniGameResult,
  MiniGameSession,
} from '../types/game'
import { applyEffects } from './applyEffects'

export const MINI_GAME_TIMEOUT_ANSWER = '__timeout__'

export type MiniGameApplicationState = {
  stats: GameStats
  flags: string[]
}

export function applyMiniGameResult(
  state: MiniGameApplicationState,
  result: MiniGameResult,
): MiniGameApplicationState {
  return {
    stats: applyEffects(state.stats, result.effects),
    flags: [...new Set([...state.flags, ...(result.flags ?? [])])],
  }
}

function deadlineAt(startedAt: Date, timeLimitMs?: number) {
  return timeLimitMs === undefined ? null : new Date(startedAt.getTime() + timeLimitMs).toISOString()
}

export function createMiniGameSession(
  eventId: string,
  config: MiniGameConfig,
  now = new Date(),
): MiniGameSession {
  const firstStage = config.stages[0]
  if (!firstStage) throw new Error(`MiniGame ${config.id} requires at least one stage`)
  const startedAt = now.toISOString()
  return {
    eventId,
    configId: config.id,
    type: config.type,
    stageIndex: 0,
    answers: {},
    stageStartedAt: startedAt,
    deadlineAt: deadlineAt(now, firstStage.timeLimitMs),
    result: null,
  }
}

function gradeOf(score: number): MiniGameGrade {
  if (score >= 9) return 'S'
  if (score >= 7) return 'A'
  if (score >= 5) return 'B'
  if (score >= 2) return 'C'
  return 'D'
}

export function resolveMiniGameResult(config: MiniGameConfig, answers: Record<string, string>): MiniGameResult {
  const score = config.stages.reduce((total, stage) => {
    const answerId = answers[stage.id]
    if (answerId === MINI_GAME_TIMEOUT_ANSWER) return total + (stage.timeout?.score ?? 0)
    return total + (stage.options.find((option) => option.id === answerId)?.score ?? 0)
  }, 0)
  const grade = gradeOf(score)
  return { score, grade, ...config.results[grade] }
}

export function answerMiniGameStage(
  session: MiniGameSession,
  config: MiniGameConfig,
  answerId: string,
  now = new Date(),
): MiniGameSession {
  if (session.result) return session
  const stage = config.stages[session.stageIndex]
  if (!stage) throw new Error(`MiniGame ${config.id} has no stage ${session.stageIndex}`)
  const validAnswer = answerId === MINI_GAME_TIMEOUT_ANSWER
    ? Boolean(stage.timeout)
    : stage.options.some((option) => option.id === answerId)
  if (!validAnswer) throw new Error(`MiniGame stage ${stage.id} does not accept ${answerId}`)

  const answers = { ...session.answers, [stage.id]: answerId }
  const nextIndex = session.stageIndex + 1
  if (nextIndex >= config.stages.length || (answerId === MINI_GAME_TIMEOUT_ANSWER && stage.timeout?.completesMiniGame)) {
    return {
      ...session,
      answers,
      stageIndex: nextIndex,
      deadlineAt: null,
      result: resolveMiniGameResult(config, answers),
    }
  }

  const nextStage = config.stages[nextIndex]
  return {
    ...session,
    answers,
    stageIndex: nextIndex,
    stageStartedAt: now.toISOString(),
    deadlineAt: deadlineAt(now, nextStage.timeLimitMs),
  }
}
