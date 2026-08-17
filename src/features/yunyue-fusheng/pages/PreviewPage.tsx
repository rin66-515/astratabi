import type { Language } from '../types/game'
import styles from '../YunyueFusheng.module.css'

export function PreviewPage({ language, onRestart, onExit }: { language: Language; onRestart: () => void; onExit: () => void }) {
  return <section className={styles.previewPage}>
    <p className={styles.kicker}>2024.09</p>
    <h1>{language === 'zh' ? '工资到账。' : '給与が振り込まれた。'}</h1>
    <strong>¥255,000</strong>
    <p>{language === 'zh' ? '固定支出开始结算。人民币债务仍然存在。' : '固定支出の精算が始まる。人民元建ての負債は、まだ残っている。'}</p>
    <aside className={styles.observer}><span>【{language === 'zh' ? '观测者' : '観測者'}】</span><p>{language === 'zh' ? '按当前速度：预计仍需 20 个月以上完成债务清零。' : '現在の速度では、負債の完済まで20か月以上と推定。'}</p></aside>
    <p className={styles.previewReply}>{language === 'zh' ? '太慢了。' : '遅すぎる。'}</p>
    <div className={styles.lockedPath}><small>{language === 'zh' ? '新的选项似乎出现了' : '新しい選択肢が現れた'}</small><b>【{language === 'zh' ? '寻找额外收入' : '追加収入を探す'}】</b><span>{language === 'zh' ? '第二月 · 制作中' : '第二月 · 制作中'}</span></div>
    <div className={styles.previewActions}><button className={styles.primaryButton} type="button" onClick={onExit}>{language === 'zh' ? '合上卷册' : '巻を閉じる'}</button><button className={styles.quietButton} type="button" onClick={onRestart}>{language === 'zh' ? '重走八月' : '八月を歩き直す'}</button></div>
  </section>
}
