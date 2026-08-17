import { stageEndingContent } from '../data/endingContent'
import type { Language, StageEndingId } from '../types/game'
import { localize } from '../utils/localize'
import styles from '../YunyueFusheng.module.css'

export function StageEndingPage({ language, endingId, onContinue }: { language: Language; endingId: StageEndingId; onContinue: () => void }) {
  const content = stageEndingContent[endingId]
  return <section className={styles.stageEndingPage}>
    <p className={styles.kicker}>{language === 'zh' ? '第一卷 · 阶段小结' : '第一巻 · 中間結語'}</p>
    <h1>《{localize(content.title, language)}》</h1>
    <div>{content.lines.map((line, index) => <p key={`${endingId}-${index}`}>{localize(line, language)}</p>)}</div>
    <small>{language === 'zh' ? '这不是结局。期限到了，路还没有。' : 'これは結末ではない。期限が来ても、道は終わらない。'}</small>
    <button className={styles.primaryButton} type="button" onClick={onContinue}>{language === 'zh' ? '继续赶路' : '旅を続ける'}</button>
  </section>
}
