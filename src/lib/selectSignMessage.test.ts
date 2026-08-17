import { describe, expect, it } from 'vitest'
import { shopStatus } from '../config/shopStatus'
import { selectSignMessage } from './selectSignMessage'

describe('selectSignMessage game promotion', () => {
  const ordinaryStatus = {
    ...shopStatus,
    phase: 'NORMAL' as const,
    keeperState: 'AT_SHOP' as const,
    latestUpdate: null,
    specialDay: null,
    recruiting: false,
    lastContentUpdatedAt: '2026-08-16',
  }

  it('selects a game sign when the configured chance is certain', () => {
    const selected = selectSignMessage(new Date('2026-08-17T12:00:00'), {
      ...ordinaryStatus,
      gamePromoEnabled: true,
      gamePromoChance: 1,
    })
    expect(selected.category).toBe('game')
    expect(selected.message.action?.href).toBe('#fusheng')
  })

  it('keeps ordinary sign selection when the game chance is zero', () => {
    const selected = selectSignMessage(new Date('2026-08-17T12:00:00'), {
      ...ordinaryStatus,
      gamePromoEnabled: true,
      gamePromoChance: 0,
    })
    expect(selected.category).not.toBe('game')
  })

  it('returns the same game message throughout the same local day', () => {
    const config = { ...ordinaryStatus, gamePromoEnabled: true, gamePromoChance: 1 }
    const morning = selectSignMessage(new Date('2026-08-17T08:00:00'), config)
    const evening = selectSignMessage(new Date('2026-08-17T20:00:00'), config)
    expect(morning.message.id).toBe(evening.message.id)
  })
})
