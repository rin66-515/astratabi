import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LanguageSwitch } from './components/LanguageSwitch'
import { firstMonthEventMap } from './data/events/firstMonth'
import { monthlyEventMap } from './data/monthlyEvents'
import { resolveFinalEnding } from './engine/endingResolver'
import { AnnualReportPage } from './pages/AnnualReportPage'
import { CoverPage } from './pages/CoverPage'
import { DebtFreeMonthPage } from './pages/DebtFreeMonthPage'
import { DebtFreeScenePage } from './pages/DebtFreeScenePage'
import { EndingDebugPage } from './pages/EndingDebugPage'
import { FinalEndingPage } from './pages/FinalEndingPage'
import { GamePage } from './pages/GamePage'
import { MonthIntroPage } from './pages/MonthIntroPage'
import { MonthSettlementPage } from './pages/MonthSettlementPage'
import { MonthSummaryPage } from './pages/MonthSummaryPage'
import { MiniGamePage } from './pages/MiniGamePage'
import { MonthlyCyclePage } from './pages/MonthlyCyclePage'
import { PreviewPage } from './pages/PreviewPage'
import { StageEndingPage } from './pages/StageEndingPage'
import { useGameStore } from './store/gameStore'
import { trackEvent } from './utils/trackEvent'
import styles from './YunyueFusheng.module.css'

export function YunyueFusheng({ onExit }: { onExit: () => void }) {
  const [opened, setOpened] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const game = useGameStore()
  const currentEvent = game.currentEventId
    ? firstMonthEventMap.get(game.currentEventId) ?? monthlyEventMap.get(game.currentEventId)
    : undefined
  const latestSettlement = game.monthlySettlements.at(-1)
  const prepareMonth = game.prepareMonth
  const shouldPrepareMonth = opened && game.screen === 'monthly-cycle' && !game.monthlyPlan

  useEffect(() => {
    if (opened && currentEvent) trackEvent('event_view', { eventId: currentEvent.id })
  }, [currentEvent, opened])

  useEffect(() => {
    if (shouldPrepareMonth) prepareMonth()
  }, [prepareMonth, shouldPrepareMonth])

  function exitGame() {
    trackEvent('game_exit', { screen: game.screen })
    onExit()
  }

  function restartGame() {
    game.startNewGame()
    trackEvent('game_restart')
    setOpened(true)
    setDebugOpen(false)
  }

  function startGame() {
    game.startNewGame()
    setOpened(true)
  }

  const screenKey = debugOpen ? 'ending-debug' : opened ? `${game.screen}:${game.currentEventId ?? 'none'}` : 'cover'
  const motionProps = reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.38 } }

  return <div className={styles.gameRoot} lang={game.language === 'ja' ? 'ja' : 'zh-CN'}>
    <header className={styles.portalBar}>
      <div className={styles.portalActions}>
        <button type="button" onClick={exitGame}>← {game.language === 'zh' ? '返回小铺' : '小舗へ戻る'}</button>
        {import.meta.env.DEV && <button type="button" onClick={() => setDebugOpen(true)}>Ending Debug</button>}
      </div>
      <LanguageSwitch language={game.language} onChange={game.setLanguage} />
    </header>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div className={styles.pageFrame} key={screenKey} {...motionProps}>
        {debugOpen
          ? <EndingDebugPage language={game.language} currentEnding={resolveFinalEnding(game)} onSimulate={(endingId) => { game.simulateFinalEnding(endingId); setDebugOpen(false); setOpened(true) }} onClose={() => setDebugOpen(false)} />
          : <>
            {!opened && <CoverPage language={game.language} hasSave={Boolean(game.startedAt)} onNewGame={startGame} onContinue={() => setOpened(true)} />}
            {opened && game.screen === 'month-intro' && <MonthIntroPage language={game.language} stats={game.stats} onEnter={game.beginMonth} />}
            {opened && game.screen === 'event' && currentEvent && <GamePage event={currentEvent} year={game.year} month={game.month} stats={game.stats} language={game.language} resolution={game.resolution} onChoose={game.chooseOption} onAdvance={game.advance} />}
            {opened && game.screen === 'monthly-minigame' && game.activeMiniGame && <MiniGamePage language={game.language} session={game.activeMiniGame} onChoose={game.chooseMonthlyMiniGameOption} onTimeout={game.timeoutMonthlyMiniGame} onContinue={game.continueAfterMonthlyMiniGame} />}
            {opened && game.screen === 'month-summary' && <MonthSummaryPage language={game.language} stats={game.stats} history={game.history} onNext={game.showPreview} />}
            {opened && game.screen === 'preview' && <PreviewPage language={game.language} onEnterNextMonth={game.enterNextMonth} onExit={exitGame} />}
            {opened && game.screen === 'monthly-cycle' && game.monthlyPlan && <MonthlyCyclePage language={game.language} year={game.year} month={game.month} stats={game.stats} progress={game.progress} flags={game.flags} sideHustles={game.sideHustles} plan={game.monthlyPlan} onPerformAction={game.performMonthlyAction} onSetExtraPayment={game.setExtraPayment} onSetFoodLifestyle={game.setFoodLifestyle} onComplete={game.completeMonth} />}
            {opened && game.screen === 'month-settlement' && latestSettlement && <MonthSettlementPage language={game.language} settlement={latestSettlement} onContinue={game.continueAfterMonthSettlement} />}
            {opened && game.screen === 'annual-report' && <AnnualReportPage language={game.language} stats={game.stats} sideHustles={game.sideHustles} history={game.history} onContinue={game.completeAnnualReport} />}
            {opened && game.screen === 'stage-ending' && game.progress.stageEnding && <StageEndingPage language={game.language} endingId={game.progress.stageEnding} onContinue={game.continueAfterStageEnding} />}
            {opened && game.screen === 'debt-free-month' && <DebtFreeMonthPage language={game.language} stats={game.stats} onChoose={game.chooseDebtFreeMonth} />}
            {opened && game.screen === 'debt-free-scene' && <DebtFreeScenePage language={game.language} onContinue={game.completeDebtFreeScene} />}
            {opened && game.screen === 'final-ending' && game.progress.finalEnding && <FinalEndingPage language={game.language} endingId={game.progress.finalEnding} onRestart={restartGame} onExit={exitGame} />}
            {opened && game.screen === 'event' && !currentEvent && <section className={styles.recoveryPage}><p>{game.language === 'zh' ? '这一页被风吹散了。存档仍在，但当前事件无法继续。' : 'この頁は風に散った。セーブは残っているが、現在のイベントを続けられない。'}</p><button className={styles.primaryButton} type="button" onClick={restartGame}>{game.language === 'zh' ? '重新入卷' : '最初から開く'}</button></section>}
          </>}
      </motion.div>
    </AnimatePresence>
  </div>
}
