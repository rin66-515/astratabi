import { finalEndingContent } from '../data/endingContent'
import type { FinalEndingId, Language } from '../types/game'
import { localize } from '../utils/localize'
import styles from '../YunyueFusheng.module.css'

export function FinalEndingPage({ language, endingId, onRestart, onExit }: { language: Language; endingId: FinalEndingId; onRestart: () => void; onExit: () => void }) {
  const content = finalEndingContent[endingId]
  return <section className={styles.finalEndingPage}>
    <p className={styles.kicker}>{language === 'zh' ? '卷末' : '巻末'}</p>
    <h1>《{localize(content.title, language)}》</h1>
    <div>{content.lines.map((line, index) => <p key={`${endingId}-${index}`}>{localize(line, language)}</p>)}</div>
    <footer><strong>{language === 'zh' ? '第一卷 · 极东 完' : '第一巻 · 極東 完'}</strong><small>{language === 'zh' ? '浮生未尽' : '浮生、いまだ尽きず'}</small></footer>
    <div className={styles.previewActions}><button className={styles.primaryButton} type="button" onClick={onExit}>{language === 'zh' ? '合上卷册' : '巻を閉じる'}</button><button className={styles.quietButton} type="button" onClick={onRestart}>{language === 'zh' ? '重新入卷' : '最初から歩く'}</button></div>
  </section>
}
