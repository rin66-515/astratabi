import type { Language } from '../types/game'
import styles from '../YunyueFusheng.module.css'

export function DebtFreeScenePage({ language, onContinue }: { language: Language; onContinue: () => void }) {
  return <section className={styles.debtFreeScene}>
    <time>02:17</time>
    <div>
      <p>{language === 'zh' ? '明天不用还信用卡。' : '明日はクレジットカードを返さなくていい。'}</p>
      <p>{language === 'zh' ? '银行账户里有钱。' : '銀行口座には金がある。'}</p>
      <p>{language === 'zh' ? '工作没有出问题。' : '仕事にも問題は起きていない。'}</p>
      <p>{language === 'zh' ? '身体今晚也没有明显疼痛。' : '今夜、身体にも目立った痛みはない。'}</p>
      <p>{language === 'zh' ? '你翻了个身。' : '寝返りを打つ。'}</p>
      <p>{language === 'zh' ? '还是睡不着。' : 'それでも眠れない。'}</p>
    </div>
    <aside className={styles.observer}><span>【{language === 'zh' ? '观测者' : '観測者'}】</span><p>{language === 'zh' ? '未检测到明确问题。' : '明確な問題は検出されませんでした。'}</p></aside>
    <p>{language === 'zh' ? '那为什么？' : 'では、なぜ？'}</p>
    <button className={styles.sceneContinue} type="button" onClick={onContinue}>{language === 'zh' ? '接下来呢？' : 'この先は？'}</button>
  </section>
}
