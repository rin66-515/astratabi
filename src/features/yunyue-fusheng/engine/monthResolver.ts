import type { FinalEndingId, GameSaveState, StageEndingId } from '../types/game'
import { resolveFinalEnding, resolveStageEnding, type EndingContext } from './endingResolver'

export const FIRST_ANNUAL_REPORT_MONTH = 12

export type MonthTransition =
  | { kind: 'annual_report'; year: 1 }
  | { kind: 'stage_ending'; endingId: StageEndingId }
  | { kind: 'debt_free_month' }
  | { kind: 'final_ending'; endingId: FinalEndingId }
  | { kind: 'next_month' }

export function resolveMonthTransition(context: EndingContext): MonthTransition {
  const { progress, stats } = context

  if (
    progress.elapsedMonths === FIRST_ANNUAL_REPORT_MONTH
    && !progress.completedAnnualReportYears.includes(1)
  ) return { kind: 'annual_report', year: 1 }

  const finalEnding = resolveFinalEnding(context)
  if (finalEnding) return { kind: 'final_ending', endingId: finalEnding }

  if (stats.debtRmb <= 0) return { kind: 'debt_free_month' }

  const stageEnding = resolveStageEnding(context)
  if (stageEnding) return { kind: 'stage_ending', endingId: stageEnding }

  return { kind: 'next_month' }
}

export function markAnnualReportComplete(state: GameSaveState, reportYear = 1): GameSaveState {
  if (state.progress.completedAnnualReportYears.includes(reportYear)) return state
  return {
    ...state,
    progress: {
      ...state.progress,
      phase: 'normal',
      completedAnnualReportYears: [...state.progress.completedAnnualReportYears, reportYear],
    },
  }
}
