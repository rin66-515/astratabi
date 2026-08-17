import { useState } from 'react'
import { CharacterDrawer } from '../components/CharacterDrawer'
import type { ChoiceResolution, GameEvent, GameStats, Language } from '../types/game'
import { localize } from '../utils/localize'
import { formatMoney, statusLabel, visibleEffectEntries } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

export function GamePage({ event, year, month, stats, language, resolution, onChoose, onAdvance }: {
  event: GameEvent
  year: number
  month: number
  stats: GameStats
  language: Language
  resolution: ChoiceResolution | null
  onChoose: (optionId: string) => void
  onAdvance: () => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const effects = resolution ? visibleEffectEntries(resolution.effects, language) : []

  return <section className={styles.gamePage}>
    <header className={styles.gameHeader}>
      <div><p>{year}.{String(month).padStart(2, '0')}</p><strong>{language === 'zh' ? '东京' : '東京'}</strong></div>
      <button type="button" onClick={() => setDrawerOpen(true)}>{language === 'zh' ? '人物笺' : '人物帖'}</button>
    </header>
    <dl className={styles.statusStrip}>
      <div><dt>{language === 'zh' ? '负债' : '負債'}</dt><dd>{formatMoney(stats.debtRmb, 'RMB', language)}</dd></div>
      <div><dt>{language === 'zh' ? '现金' : '現金'}</dt><dd>{formatMoney(stats.cashJpy, 'JPY', language)}</dd></div>
      <div><dt>{language === 'zh' ? '身体' : '身体'}</dt><dd>{statusLabel('health', stats.health, language)}</dd></div>
      <div><dt>{language === 'zh' ? '精神' : '精神'}</dt><dd>{statusLabel('mental', stats.mental, language)}</dd></div>
      <div><dt>{language === 'zh' ? '社交' : '対人'}</dt><dd>{statusLabel('socialBattery', stats.socialBattery, language)}</dd></div>
      <div><dt>{language === 'zh' ? '自由' : '自由'}</dt><dd>{statusLabel('freedom', stats.freedom, language)}</dd></div>
      <div className={stats.actionPoints < 0 ? styles.overdrawn : ''}><dt>{language === 'zh' ? '行动点' : '行動点'}</dt><dd>{stats.actionPoints}</dd></div>
    </dl>

    <article className={styles.eventScroll} aria-labelledby="event-title">
      <p className={styles.eventNumber}>{event.id.replace('main-', 'RECORD ')}</p>
      <h1 id="event-title">{localize(event.title, language)}</h1>
      <div className={styles.eventBody}>{event.text.map((line, index) => <p key={`${event.id}-line-${index}`}>{localize(line, language)}</p>)}</div>
      {event.observer && <aside className={styles.observer}><span>【{language === 'zh' ? '观测者' : '観測者'}】</span>{event.observer.map((line, index) => <p key={`${event.id}-observer-${index}`}>{localize(line, language)}</p>)}</aside>}
    </article>

    {!resolution
      ? <div className={styles.optionList} aria-label={language === 'zh' ? '选择' : '選択肢'}>
        {event.options.map((option, index) => <button className={option.fantasy ? styles.fantasyOption : ''} type="button" onClick={() => onChoose(option.id)} key={option.id}><span>{String.fromCharCode(65 + index)}</span>{localize(option.label, language)}</button>)}
      </div>
      : <section className={styles.resolutionPanel} aria-live="polite">
        <p className={styles.kicker}>{language === 'zh' ? '选择已经落笔' : '選択は記された'}</p>
        {resolution.response.length > 0 && <div>{resolution.response.map((line, index) => <p key={`${resolution.optionId}-response-${index}`}>{localize(line, language)}</p>)}</div>}
        {effects.length > 0 && <ul className={styles.effectList}>{effects.map((effect) => <li className={effect.positive ? styles.positive : styles.negative} key={effect.key}><span>{effect.label}</span><strong>{effect.value}</strong></li>)}</ul>}
        <button className={styles.primaryButton} type="button" onClick={onAdvance}>{language === 'zh' ? '继续翻页' : '次の頁へ'}</button>
      </section>}

    <CharacterDrawer open={drawerOpen} stats={stats} language={language} onClose={() => setDrawerOpen(false)} />
  </section>
}
