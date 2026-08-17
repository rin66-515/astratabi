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

export function resolveReadTheAirResult(config: MiniGameConfig, answers: Record<string, string>): MiniGameResult {
  const score = config.stages.reduce((total, stage) => {
    const answerId = answers[stage.id]
    if (answerId === MINI_GAME_TIMEOUT_ANSWER) return total + (stage.timeout?.score ?? 0)
    return total + (stage.options.find((option) => option.id === answerId)?.score ?? 0)
  }, 0)
  const grade = gradeOf(score)
  const results: Record<MiniGameGrade, Omit<MiniGameResult, 'score' | 'grade'>> = {
    S: {
      effects: { workplace: 5, boundary: 3, workTrust: 2, mental: 1 },
      flags: ['read_air_completed', 'read_air_clear'],
      resultText: { zh: '你没有猜中所有人的心思。你只是让没说出口的事，变成了可以确认的事。', ja: '全員の本音を当てたわけではない。言葉になっていないことを、確認できることに変えただけだ。' },
    },
    A: {
      effects: { workplace: 3, boundary: 2, workTrust: 2 },
      flags: ['read_air_completed', 'read_air_steady'],
      resultText: { zh: '大部分含糊都被你问清。会议没有漂亮结束，但工作能够继续。', ja: '曖昧な部分の多くを確認できた。きれいな終わり方ではなくても、仕事は続けられる。' },
    },
    B: {
      effects: { workplace: 1, stress: 1 },
      flags: ['read_air_completed'],
      resultText: { zh: '你读懂了一部分，也承担了一部分没有确认的内容。至少没有完全失去方向。', ja: '一部は読み取れたが、確認しないまま引き受けた部分もある。それでも、完全に方向を失うことはなかった。' },
    },
    C: {
      effects: { workplace: -1, mental: -2, stress: 4, recoveryDebt: 2 },
      flags: ['read_air_completed', 'read_air_overcommitted'],
      resultText: { zh: '会议结束了，真正的任务却留到会后才靠猜测成形。', ja: '会議は終わった。本当のタスクは、会議後に推測で形になった。' },
    },
    D: {
      effects: { workplace: -2, mental: -4, stress: 7, recoveryDebt: 4, lossOfControl: 2 },
      flags: ['read_air_completed', 'read_air_timed_out'],
      resultText: { zh: '你一直在等一句明确的话。最后，沉默替所有人做了决定。', ja: '明確な一言を待ち続けた。最後は、沈黙が全員の代わりに決めた。' },
    },
  }
  return { score, grade, ...results[grade] }
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
      result: resolveReadTheAirResult(config, answers),
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
