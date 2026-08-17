import type { MonthlyEventDefinition } from '../types/game'

/**
 * Extension point for the monthly lifecycle. The first integration slice intentionally
 * ships with no production events so existing pacing and endings remain unchanged.
 */
export const monthlyEventDefinitions: readonly MonthlyEventDefinition[] = []

export const monthlyEventMap = new Map(
  monthlyEventDefinitions.map((definition) => [definition.event.id, definition.event]),
)
