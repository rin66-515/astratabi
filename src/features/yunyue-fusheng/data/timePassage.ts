import type {
  GameEffects,
  LocalizedText,
  StagePolicyId,
  TimePassageCauseId,
} from '../types/game'

export type StagePolicyContent = {
  label: LocalizedText
  description: LocalizedText
}

export type TimePassageCauseContent = {
  title: LocalizedText
  lines: LocalizedText[]
  minSkippedMonths: number
  maxSkippedMonths: number
  monthlyEffects: GameEffects
  disruptive: boolean
}

export const stagePolicyContent: Record<StagePolicyId, StagePolicyContent> = {
  balanced: {
    label: { zh: '照常生活', ja: '普段どおり暮らす' },
    description: { zh: '工作、休息与一点留白都不放下。', ja: '仕事と休息、それから少しの余白を残す。' },
  },
  recovery: {
    label: { zh: '先把身体养回来', ja: 'まず身体を戻す' },
    description: { zh: '减少消耗，把恢复放在最前面。', ja: '消耗を減らし、回復を最優先にする。' },
  },
  career: {
    label: { zh: '这段时间以工作为重', ja: 'しばらく仕事を優先する' },
    description: { zh: '整理现场、积累信赖，也承担相应压力。', ja: '現場を整え、信頼を積み、その重さも引き受ける。' },
  },
  study: {
    label: { zh: '继续学习', ja: '学びを続ける' },
    description: { zh: '把有限的空闲留给日语和技术。', ja: '限られた余暇を日本語と技術に使う。' },
  },
  debt: {
    label: { zh: '集中处理债务', ja: '返済を優先する' },
    description: { zh: '维持生活，把可用余款继续用于还债。', ja: '暮らしを保ち、余剰を返済へ回し続ける。' },
  },
  side_hustle: {
    label: { zh: '经营已经出现的另一条路', ja: '見え始めた別の道を育てる' },
    description: { zh: '持续投入已经解锁的副业，但不保证每个月都有机会。', ja: '解放済みの副業を続けるが、毎月機会があるとは限らない。' },
  },
}

export const timePassageCauseContent: Record<TimePassageCauseId, TimePassageCauseContent> = {
  quiet: {
    title: { zh: '日子照常向前', ja: '日々はいつもどおり進んだ' },
    lines: [
      { zh: '没有特别值得写下来的大事。', ja: '特に書き残すほどの出来事はなかった。' },
      { zh: '工资照常到账，账单照常寄来，季节在通勤路上悄悄变了。', ja: '給料は入り、請求書は届き、通勤路の季節だけが静かに変わった。' },
    ],
    minSkippedMonths: 2,
    maxSkippedMonths: 3,
    monthlyEffects: {},
    disruptive: false,
  },
  illness: {
    title: { zh: '肠胃又一次提出抗议', ja: '胃腸が、もう一度抗議した' },
    lines: [
      { zh: '三天两头往医院跑，复查、开药，有时还要输液。', ja: '数日おきに病院へ行き、診察と薬、ときには点滴も受けた。' },
      { zh: '除了上班和恢复，这段时间没有余力再做别的事。', ja: '仕事と回復だけで、この時期はほかのことをする余力がなかった。' },
    ],
    minSkippedMonths: 2,
    maxSkippedMonths: 2,
    monthlyEffects: { cashJpy: -8_000, health: -3, mental: -1, recoveryDebt: 1 },
    disruptive: true,
  },
  project_crunch: {
    title: { zh: '项目忽然烧了起来', ja: '案件が、急に燃え始めた' },
    lines: [
      { zh: '白天是会议，晚上是修正。日历翻过几页，任务却没有明显变少。', ja: '昼は会議、夜は修正。暦だけが進み、作業はなかなか減らなかった。' },
      { zh: '你记得自己一直在工作，却想不起这几个月还做过什么。', ja: '働き続けていたことは覚えているが、この数か月にほかに何をしたかは思い出せない。' },
    ],
    minSkippedMonths: 2,
    maxSkippedMonths: 2,
    monthlyEffects: { workplace: 1, workTrust: 1, stress: 5, recoveryDebt: 4, mental: -2, boundary: -1 },
    disruptive: true,
  },
  game_absorption: {
    title: { zh: '有几个月，只剩下上班与三角洲', ja: 'しばらく、仕事とゲームだけの日々になった' },
    lines: [
      { zh: '下班后戴上耳机，再抬头时往往已经是深夜。', ja: '退勤後にヘッドセットを着け、顔を上げる頃にはいつも深夜だった。' },
      { zh: '它确实让你暂时忘掉了很多事，也包括原本想做的那些事。', ja: '多くのことを一時忘れられた。やろうとしていたことまで含めて。' },
    ],
    minSkippedMonths: 2,
    maxSkippedMonths: 3,
    monthlyEffects: { mental: -2, freedom: -2, stress: -1, recoveryDebt: 2, lossOfControl: 3 },
    disruptive: true,
  },
  side_hustle_sprint: {
    title: { zh: '另一条路渐渐占据了夜晚', ja: '別の道が、少しずつ夜を占めた' },
    lines: [
      { zh: '下班后的时间被一件尚未成熟的作品填满。', ja: '退勤後の時間は、まだ未完成の仕事で埋まっていった。' },
      { zh: '进展并不总是顺利，但它终于不再只是一个念头。', ja: '順調とは限らなかったが、それはもう思いつきだけではなかった。' },
    ],
    minSkippedMonths: 2,
    maxSkippedMonths: 2,
    monthlyEffects: { stress: 2, recoveryDebt: 1 },
    disruptive: false,
  },
}
