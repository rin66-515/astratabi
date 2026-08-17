import type { GameEffects, GameStats, Language, LocalizedText, StatKey } from '../types/game'
import { text as t } from './localize'

type Threshold = { minimum: number; label: LocalizedText }

const statusThresholds: Record<'health' | 'mental' | 'socialBattery' | 'freedom', Threshold[]> = {
  health: [
    { minimum: 75, label: t('良好', '良好') }, { minimum: 55, label: t('尚可', 'まずまず') },
    { minimum: 35, label: t('有些不适', 'やや不調') }, { minimum: 15, label: t('较差', '不調') },
    { minimum: 0, label: t('危险', '危険') },
  ],
  mental: [
    { minimum: 75, label: t('平静', '穏やか') }, { minimum: 55, label: t('尚可', 'まずまず') },
    { minimum: 35, label: t('紧绷', '張り詰めている') }, { minimum: 15, label: t('疲惫', '疲弊') },
    { minimum: 0, label: t('濒临失控', '限界に近い') },
  ],
  socialBattery: [
    { minimum: 75, label: t('充足', '十分') }, { minimum: 50, label: t('一般', '普通') },
    { minimum: 25, label: t('疲惫', '疲れ気味') }, { minimum: 0, label: t('耗尽', '空') },
  ],
  freedom: [
    { minimum: 80, label: t('自由', '自由') }, { minimum: 60, label: t('可以拒绝一些事情', 'いくつか断れる') },
    { minimum: 40, label: t('开始拥有选择', '選択肢が生まれた') }, { minimum: 20, label: t('有一点余地', '少し余地がある') },
    { minimum: 0, label: t('被生活推着走', '生活に押されている') },
  ],
}

const effectLabels: Partial<Record<StatKey, LocalizedText>> = {
  debtRmb: t('负债', '負債'), cashJpy: t('现金', '現金'), actionPoints: t('行动点', '行動点'),
  health: t('身体', '身体'), mental: t('精神', '精神'), socialBattery: t('社交', '対人電池'),
  freedom: t('自由', '自由'), japanese: t('日语', '日本語'), tech: t('技术', '技術'),
  workplace: t('职场', '職場'), product: t('产品', 'プロダクト'),
}

export function statusLabel(key: keyof typeof statusThresholds, value: number, language: Language) {
  const match = statusThresholds[key].find((threshold) => value >= threshold.minimum)
  return match?.label[language] ?? '—'
}

export function skillLabel(value: number, language: Language) {
  if (value >= 80) return language === 'zh' ? '熟练' : '熟練'
  if (value >= 60) return language === 'zh' ? '能够应对' : '対応できる'
  if (value >= 40) return language === 'zh' ? '成长中' : '成長中'
  if (value >= 20) return language === 'zh' ? '刚刚起步' : '始めたばかり'
  return language === 'zh' ? '尚未展开' : 'まだこれから'
}

export function formatMoney(value: number, currency: 'JPY' | 'RMB', language: Language) {
  return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'ja-JP', {
    style: 'currency',
    currency: currency === 'RMB' ? 'CNY' : 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

export function visibleEffectEntries(effects: GameEffects, language: Language) {
  return Object.entries(effects).flatMap(([rawKey, rawDelta]) => {
    const key = rawKey as StatKey
    const delta = rawDelta ?? 0
    const label = effectLabels[key]
    if (!label || delta === 0) return []
    const absolute = Math.abs(delta)
    const value = key === 'cashJpy'
      ? formatMoney(absolute, 'JPY', language)
      : key === 'debtRmb'
        ? formatMoney(absolute, 'RMB', language)
        : String(absolute)
    return [{ key, label: label[language], value: `${delta > 0 ? '+' : '−'}${value}`, positive: delta > 0 }]
  })
}

export function monthDelta(stats: GameStats, key: 'cashJpy' | 'debtRmb') {
  const initial = key === 'cashJpy' ? 260_000 : 100_000
  return stats[key] - initial
}
