import type { Language } from '../types/game'
import styles from '../YunyueFusheng.module.css'

export function CoverPage({ language, hasSave, onNewGame, onContinue }: { language: Language; hasSave: boolean; onNewGame: () => void; onContinue: () => void }) {
  return <section className={styles.coverPage} aria-labelledby="fusheng-title">
    <div className={styles.tokyoGlow} aria-hidden="true"><i /><i /><i /></div>
    <div className={styles.coverCopy}>
      <p className={styles.volume}>{language === 'zh' ? '第一卷' : '第一巻'}</p>
      <h1 id="fusheng-title">云月浮生</h1>
      <h2>{language === 'zh' ? '极东' : '極東'}</h2>
      <p>{language === 'zh' ? '这是你第二次来到日本。' : '日本に来るのは、これが二度目だ。'}</p>
      <div className={styles.coverActions}>
        <button className={styles.primaryButton} type="button" onClick={onNewGame}>{language === 'zh' ? '入卷' : '巻を開く'}</button>
        {hasSave && <button className={styles.quietButton} type="button" onClick={onContinue}>{language === 'zh' ? '继续' : '続きから'}</button>}
      </div>
    </div>
    <p className={styles.coverFootnote}>{language === 'zh' ? '选择不会告诉你答案，只会留下来路。' : '選択は答えを教えない。ただ、歩いた跡を残す。'}</p>
  </section>
}
