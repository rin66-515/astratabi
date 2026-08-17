import type { FinalEndingId, GameSaveState, StageEndingId } from '../types/game'

export type EndingContext = Pick<GameSaveState, 'stats' | 'flags' | 'progress'>

export type EndingResolution =
  | { kind: 'none' }
  | { kind: 'stage'; endingId: StageEndingId }
  | { kind: 'debt_free_month' }
  | { kind: 'final'; endingId: FinalEndingId }

function hasAnyFlag(flags: string[], candidates: readonly string[]) {
  return candidates.some((flag) => flags.includes(flag))
}

function isBurnedOut({ stats }: EndingContext) {
  return stats.health <= 25 || stats.mental <= 25 || stats.recoveryDebt >= 75
}

function isGoldenCage({ stats }: EndingContext) {
  return stats.workTrust >= 60 && stats.boundary < 35 && stats.freedom < 40
}

function isEscapeParadise({ stats, flags }: EndingContext) {
  return stats.lossOfControl >= 65 || hasAnyFlag(flags, ['entertainment_escape', 'vr_escape'])
}

function isNewPath({ stats, flags }: EndingContext) {
  return stats.product >= 45 || hasAnyFlag(flags, ['sidejob_established', 'product_released'])
}

function isRootedAbroad({ stats }: EndingContext) {
  return stats.workTrust >= 45 && stats.health >= 40 && stats.mental >= 40
}

export function resolveStageEnding(context: EndingContext): StageEndingId | null {
  const { progress, stats } = context
  const deadline = progress.stageDeadlineMonths

  if (
    stats.debtRmb <= 0
    || progress.elapsedMonths !== deadline
    || progress.resolvedStageEndingMonths.includes(deadline)
  ) return null

  if (isBurnedOut(context)) return 'stage_burnout'
  if (isGoldenCage(context)) return 'stage_golden_cage'
  if (isEscapeParadise(context)) return 'stage_escape_paradise'
  if (isNewPath(context)) return 'stage_new_path'
  if (context.stats.boundary >= 70) return 'stage_boundary_awakened'
  if (isRootedAbroad(context)) return 'stage_rooted_abroad'
  return 'stage_debt_continues'
}

export function resolveFinalEnding(context: EndingContext): FinalEndingId | null {
  const { progress, stats } = context
  if (stats.debtRmb > 0 || !progress.debtFreeMonthCompleted) return null

  if (
    stats.boundary >= 75
    && stats.freedom >= 70
    && stats.health >= 45
    && stats.mental >= 45
    && stats.product >= 40
    && stats.recoveryDebt <= 45
    && stats.lossOfControl <= 45
  ) return 'yuzhe'
  if (stats.boundary >= 70) return 'boundary_awakened'
  if (isBurnedOut(context)) return 'burnout'
  if (isGoldenCage(context)) return 'golden_cage'
  if (isEscapeParadise(context)) return 'escape_paradise'
  if (isNewPath(context)) return 'new_path'
  if (isRootedAbroad(context)) return 'rooted_abroad'
  return 'debt_free'
}

export function resolveEnding(context: EndingContext): EndingResolution {
  const finalEnding = resolveFinalEnding(context)
  if (finalEnding) return { kind: 'final', endingId: finalEnding }

  if (context.stats.debtRmb <= 0) return { kind: 'debt_free_month' }

  const stageEnding = resolveStageEnding(context)
  if (stageEnding) return { kind: 'stage', endingId: stageEnding }

  return { kind: 'none' }
}
