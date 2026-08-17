import { finalEndingContent, finalEndingIds } from '../data/endingContent'
import type { FinalEndingId, Language } from '../types/game'
import { localize } from '../utils/localize'
import styles from '../YunyueFusheng.module.css'

export function EndingDebugPage({ language, currentEnding, onSimulate, onClose }: {
  language: Language
  currentEnding: FinalEndingId | null
  onSimulate: (endingId: FinalEndingId) => void
  onClose: () => void
}) {
  return <section className={styles.endingDebugPage}>
    <p className={styles.kicker}>DEV ONLY</p>
    <h1>Ending Debug</h1>
    <p>{language === 'zh' ? '每个按钮都会构造状态并通过真实Final Ending Resolver判定。' : '各ボタンは状態を構築し、実際の Final Ending Resolver で判定する。'}</p>
    <p><strong>{language === 'zh' ? '当前判定' : '現在の判定'}：</strong>{currentEnding ?? '—'}</p>
    <div>{finalEndingIds.map((endingId) => <button type="button" onClick={() => onSimulate(endingId)} key={endingId}><span>{endingId}</span><strong>《{localize(finalEndingContent[endingId].title, language)}》</strong></button>)}</div>
    <button className={styles.quietButton} type="button" onClick={onClose}>{language === 'zh' ? '返回游戏' : 'ゲームへ戻る'}</button>
  </section>
}
