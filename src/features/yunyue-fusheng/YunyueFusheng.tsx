import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LanguageSwitch } from './components/LanguageSwitch'
import { firstMonthEventMap } from './data/events/firstMonth'
import { CoverPage } from './pages/CoverPage'
import { GamePage } from './pages/GamePage'
import { MonthIntroPage } from './pages/MonthIntroPage'
import { MonthSummaryPage } from './pages/MonthSummaryPage'
import { PreviewPage } from './pages/PreviewPage'
import { useGameStore } from './store/gameStore'
import { trackEvent } from './utils/trackEvent'
import styles from './YunyueFusheng.module.css'

export function YunyueFusheng({ onExit }: { onExit: () => void }) {
  const [opened, setOpened] = useState(false)
  const reduceMotion = useReducedMotion()
  const game = useGameStore()
  const currentEvent = game.currentEventId ? firstMonthEventMap.get(game.currentEventId) : undefined

  useEffect(() => {
    if (opened && currentEvent) trackEvent('event_view', { eventId: currentEvent.id })
  }, [currentEvent, opened])

  function exitGame() {
    trackEvent('game_exit', { screen: game.screen })
    onExit()
  }

  function restartGame() {
    game.startNewGame()
    trackEvent('game_restart')
    setOpened(true)
  }

  function startGame() {
    game.startNewGame()
    setOpened(true)
  }

  const screenKey = opened ? `${game.screen}:${game.currentEventId ?? 'none'}` : 'cover'
  const motionProps = reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.38 } }

  return <div className={styles.gameRoot} lang={game.language === 'ja' ? 'ja' : 'zh-CN'}>
    <header className={styles.portalBar}>
      <button type="button" onClick={exitGame}>← {game.language === 'zh' ? '返回小铺' : '小舗へ戻る'}</button>
      <LanguageSwitch language={game.language} onChange={game.setLanguage} />
    </header>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div className={styles.pageFrame} key={screenKey} {...motionProps}>
        {!opened && <CoverPage language={game.language} hasSave={Boolean(game.startedAt)} onNewGame={startGame} onContinue={() => setOpened(true)} />}
        {opened && game.screen === 'month-intro' && <MonthIntroPage language={game.language} stats={game.stats} onEnter={game.beginMonth} />}
        {opened && game.screen === 'event' && currentEvent && <GamePage event={currentEvent} stats={game.stats} language={game.language} resolution={game.resolution} onChoose={game.chooseOption} onAdvance={game.advance} />}
        {opened && game.screen === 'month-summary' && <MonthSummaryPage language={game.language} stats={game.stats} history={game.history} onNext={game.showPreview} />}
        {opened && game.screen === 'preview' && <PreviewPage language={game.language} onRestart={restartGame} onExit={exitGame} />}
        {opened && game.screen === 'event' && !currentEvent && <section className={styles.recoveryPage}><p>{game.language === 'zh' ? '这一页被风吹散了。存档仍在，但当前事件无法继续。' : 'この頁は風に散った。セーブは残っているが、現在のイベントを続けられない。'}</p><button className={styles.primaryButton} type="button" onClick={restartGame}>{game.language === 'zh' ? '重新入卷' : '最初から開く'}</button></section>}
      </motion.div>
    </AnimatePresence>
  </div>
}
