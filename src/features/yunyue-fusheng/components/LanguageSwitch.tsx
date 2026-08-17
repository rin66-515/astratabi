import type { Language } from '../types/game'
import styles from '../YunyueFusheng.module.css'

export function LanguageSwitch({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return <div className={styles.languageSwitch} aria-label="语言 / 言語">
    <button className={language === 'zh' ? styles.active : ''} type="button" onClick={() => onChange('zh')} aria-pressed={language === 'zh'}>中</button>
    <span aria-hidden="true">/</span>
    <button className={language === 'ja' ? styles.active : ''} type="button" onClick={() => onChange('ja')} aria-pressed={language === 'ja'}>日</button>
  </div>
}
