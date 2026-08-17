import { shopStatus, type ShopStatusConfig } from '../config/shopStatus'
import {
  allSignMessages,
  signMessages,
  type SignCategory,
  type SignMessage,
} from '../data/signMessages'

export type SelectedSign = {
  category: SignCategory
  message: SignMessage
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function daysSince(value: string, now: Date) {
  const target = parseLocalDate(value)
  const today = parseLocalDate(localDateKey(now))
  return Math.floor((today.getTime() - target.getTime()) / 86_400_000)
}

function isActiveUntil(until: string | null, now: Date) {
  return until === null || daysSince(until, now) <= 0
}

function stableIndex(seed: string, length: number) {
  let hash = 2_166_136_261
  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return Math.abs(hash) % length
}

function selectFrom(category: SignCategory, messages: readonly SignMessage[], now: Date, config: ShopStatusConfig): SelectedSign {
  const seed = `${localDateKey(now)}:${category}:${config.selectionVersion}`
  return { category, message: messages[stableIndex(seed, messages.length)] }
}

export function selectSignMessage(now = new Date(), config: ShopStatusConfig = shopStatus): SelectedSign {
  if (config.pinnedMessageId) {
    const pinned = allSignMessages.find((message) => message.id === config.pinnedMessageId)
    if (pinned) {
      const category = (Object.entries(signMessages).find(([, messages]) => messages.includes(pinned))?.[0] ?? 'day') as SignCategory
      return { category, message: pinned }
    }
  }

  if (config.recruiting) {
    return selectFrom('recruiting', signMessages.recruiting, now, config)
  }

  if (config.keeperState === 'AWAY' && isActiveUntil(config.awayUntil, now)) {
    return selectFrom('away', signMessages.away, now, config)
  }

  if (config.specialDay) {
    const messages = signMessages.special.filter((message) => message.specialDayKind === config.specialDay)
    if (messages.length > 0) return selectFrom('special', messages, now, config)
  }

  if (config.latestUpdate && daysSince(config.lastContentUpdatedAt, now) <= config.newContentForDays) {
    const messages = signMessages.update.filter((message) => message.updateKind === config.latestUpdate)
    if (messages.length > 0) return selectFrom('update', messages, now, config)
  }

  const gamePromoThreshold = Math.round(Math.min(1, Math.max(0, config.gamePromoChance)) * 10_000)
  const gamePromoSeed = `${localDateKey(now)}:game-promo:${config.selectionVersion}`
  if (config.gamePromoEnabled && stableIndex(gamePromoSeed, 10_000) < gamePromoThreshold) {
    return selectFrom('game', signMessages.game, now, config)
  }

  if (daysSince(config.lastContentUpdatedAt, now) >= config.inactiveAfterDays) {
    return selectFrom('inactive', signMessages.inactive, now, config)
  }

  if (config.weather === 'SNOW') {
    return selectFrom('snow', signMessages.snow, now, config)
  }

  if (config.weather === 'RAIN') {
    return selectFrom('rain', signMessages.rain, now, config)
  }

  if (config.phase === 'OPENING' && isActiveUntil(config.openingUntil, now)) {
    return selectFrom('opening', signMessages.opening, now, config)
  }

  if (now.getDay() === 0 || now.getDay() === 6) {
    return selectFrom('weekend', signMessages.weekend, now, config)
  }

  const hour = now.getHours()
  if (hour >= 22 || hour < 5) {
    return selectFrom('night', signMessages.night, now, config)
  }

  if (hour < 10) {
    return selectFrom('morning', signMessages.morning, now, config)
  }

  return selectFrom('day', signMessages.day, now, config)
}
