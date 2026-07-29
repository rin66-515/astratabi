import type { SpecialDayKind, UpdateKind } from '../data/signMessages'

export type ShopPhase = 'OPENING' | 'NORMAL'
export type KeeperState = 'AT_SHOP' | 'AWAY'
export type ShopWeather = 'CLEAR' | 'RAIN' | 'SNOW'

export type ShopStatusConfig = {
  phase: ShopPhase
  openingUntil: string
  keeperState: KeeperState
  awayUntil: string | null
  recruiting: boolean
  weather: ShopWeather
  specialDay: SpecialDayKind | null
  latestUpdate: UpdateKind | null
  lastContentUpdatedAt: string
  newContentForDays: number
  inactiveAfterDays: number
  pinnedMessageId: string | null
  selectionVersion: string
}

/**
 * First-stage manual control for the public shop sign.
 *
 * Change only values that are true in the real shop state. Recruitment, absence,
 * weather and special-day messages are deliberately disabled by default.
 * selectionVersion can be changed to choose a different stable message today.
 */
export const shopStatus: ShopStatusConfig = {
  phase: 'OPENING',
  openingUntil: '2026-08-30',
  keeperState: 'AT_SHOP',
  awayUntil: null,
  recruiting: false,
  weather: 'CLEAR',
  specialDay: null,
  latestUpdate: null,
  lastContentUpdatedAt: '2026-07-30',
  newContentForDays: 3,
  inactiveAfterDays: 30,
  pinnedMessageId: null,
  selectionVersion: '1',
}
