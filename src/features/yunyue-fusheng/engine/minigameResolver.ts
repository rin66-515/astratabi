import type { GameStats, MiniGameResult } from '../types/game'
import { applyEffects } from './applyEffects'

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
