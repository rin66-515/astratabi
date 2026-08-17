import { useEffect, useRef, useState } from 'react'
import { miniGameConfigs } from '../data/miniGames'
import { MINI_GAME_TIMEOUT_ANSWER } from '../engine/minigameResolver'
import type { Language, MiniGameSession } from '../types/game'
import { localize } from '../utils/localize'
import { visibleEffectEntries } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

function remainingMilliseconds(deadlineAt: string | null, now: number) {
  return deadlineAt === null ? null : Math.max(0, new Date(deadlineAt).getTime() - now)
}

export function MiniGamePage({
  language,
  session,
  onChoose,
  onTimeout,
  onContinue,
}: {
  language: Language
  session: MiniGameSession
  onChoose: (optionId: string) => void
  onTimeout: () => void
  onContinue: () => void
}) {
  const config = miniGameConfigs.get(session.configId)
  const [now, setNow] = useState(() => Date.now())
  const timedOutDeadline = useRef<string | null>(null)
  const remaining = remainingMilliseconds(session.deadlineAt, now)

  useEffect(() => {
    if (!session.deadlineAt || session.result) return

    const tick = () => {
      const currentTime = Date.now()
      const next = remainingMilliseconds(session.deadlineAt, currentTime)
      setNow(currentTime)
      if (next === 0 && timedOutDeadline.current !== session.deadlineAt) {
        timedOutDeadline.current = session.deadlineAt
        onTimeout()
      }
    }
    const immediateTimer = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 100)
    return () => {
      window.clearTimeout(immediateTimer)
      window.clearInterval(timer)
    }
  }, [onTimeout, session.deadlineAt, session.result])

  if (!config) {
    return <section className={styles.recoveryPage}>
      <p>{language === 'zh' ? '这段对话暂时无法继续。' : 'この会話は現在続けられない。'}</p>
    </section>
  }

  if (session.result) {
    const effects = visibleEffectEntries(session.result.effects, language)
    return <section className={styles.miniGamePage}>
      <div className={styles.miniGameResult}>
        <p className={styles.kicker}>{language === 'zh' ? '会社读空气 · 结果' : '会社の空気を読む・結果'}</p>
        <div className={styles.gradeStamp} aria-label={`${language === 'zh' ? '评价' : '評価'} ${session.result.grade}`}>{session.result.grade}</div>
        <h1>{language === 'zh' ? '会议散了' : '会議が終わった'}</h1>
        {session.result.resultText && <p>{localize(session.result.resultText, language)}</p>}
        {effects.length > 0 && <ul className={styles.effectList}>{effects.map((effect) => <li className={effect.positive ? styles.positive : styles.negative} key={effect.key}><span>{effect.label}</span><strong>{effect.value}</strong></li>)}</ul>}
        <button className={styles.primaryButton} type="button" onClick={onContinue}>{language === 'zh' ? '回到这个月' : '今月へ戻る'}</button>
      </div>
    </section>
  }

  const stage = config.stages[session.stageIndex]
  if (!stage) return null
  const seconds = remaining === null ? null : Math.ceil(remaining / 1_000)
  const history = config.stages.slice(0, session.stageIndex).map((pastStage) => {
    const answerId = session.answers[pastStage.id]
    return {
      stage: pastStage,
      response: answerId === MINI_GAME_TIMEOUT_ANSWER
        ? pastStage.timeout?.resultText
        : pastStage.options.find((option) => option.id === answerId)?.response,
    }
  })

  return <section className={styles.miniGamePage}>
    <div className={styles.miniGamePanel}>
      <header className={styles.miniGameHeader}>
        <div>
          <p className={styles.kicker}>{language === 'zh' ? '会社读空气' : '会社の空気を読む'}</p>
          <strong>{session.stageIndex + 1} / {config.stages.length}</strong>
        </div>
        {seconds !== null && <output className={seconds <= 3 ? styles.timerUrgent : ''} aria-live="polite">{seconds.toString().padStart(2, '0')}</output>}
      </header>

      {history.length > 0 && <div className={styles.miniGameHistory}>{history.map(({ stage: pastStage, response }) => response && <p key={pastStage.id}>{localize(response, language)}</p>)}</div>}

      <article className={styles.miniGameDialogue}>
        <span>{localize(stage.speaker, language)}</span>
        {stage.prompt.map((line, index) => <p key={`${stage.id}-${index}`}>{localize(line, language)}</p>)}
      </article>

      <div className={styles.miniGameOptions}>
        {stage.options.map((option) => <button
          className={option.tone === 'jianghu' ? styles.fantasyOption : ''}
          key={option.id}
          type="button"
          onClick={() => onChoose(option.id)}
        >{localize(option.label, language)}</button>)}
      </div>
    </div>
  </section>
}
