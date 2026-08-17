import type { GameStats, Language } from '../types/game'
import { skillLabel } from '../utils/presentation'
import styles from '../YunyueFusheng.module.css'

const skills = [
  { key: 'japanese', zh: '日语', ja: '日本語' },
  { key: 'tech', zh: '技术', ja: '技術' },
  { key: 'workplace', zh: '职场', ja: '職場' },
  { key: 'product', zh: '产品', ja: 'プロダクト' },
] as const

export function CharacterDrawer({ open, stats, language, onClose }: { open: boolean; stats: GameStats; language: Language; onClose: () => void }) {
  if (!open) return null
  return <div className={styles.drawerLayer}>
    <button className={styles.drawerBackdrop} type="button" aria-label={language === 'zh' ? '关闭人物页' : '人物頁を閉じる'} onClick={onClose} />
    <aside className={styles.characterDrawer} role="dialog" aria-modal="true" aria-labelledby="character-title">
      <button className={styles.drawerClose} type="button" onClick={onClose}>{language === 'zh' ? '收起' : '閉じる'}</button>
      <p className={styles.kicker}>{language === 'zh' ? '人物笺' : '人物帖'}</p>
      <h2 id="character-title">{language === 'zh' ? '无名的赴日程序员' : '名もない来日エンジニア'}</h2>
      <p>{language === 'zh' ? '身份并不能解释一切。至少眼下，这些是你还能依靠的东西。' : '肩書だけでは何も説明できない。少なくとも今、頼れるものはこれだけだ。'}</p>
      <dl className={styles.skillList}>
        {skills.map((skill) => <div key={skill.key}><dt>{skill[language]}</dt><dd><strong>{stats[skill.key]}</strong><span>{skillLabel(stats[skill.key], language)}</span></dd></div>)}
      </dl>
      <small>{language === 'zh' ? '还有一些东西尚未被你看见。' : 'まだ、自分にも見えていないものがある。'}</small>
    </aside>
  </div>
}
