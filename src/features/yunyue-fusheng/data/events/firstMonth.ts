import type { GameEvent } from '../../types/game'
import { text as t } from '../../utils/localize'

export const firstMonthEvents: readonly GameEvent[] = [
  {
    id: 'main-00-arrival',
    title: t('这是你第二次来到日本', '二度目の日本'),
    category: 'main',
    month: 8,
    order: 0,
    text: [
      t('飞机落地的时候，窗外已经快黑了。', '飛行機が着陸したころ、窓の外はもう暗くなりかけていた。'),
      t('这是你第二次来到日本。上一次，你还在语言学校。后来疫情来了，家里不断催你回去。', '日本に来るのは、これが二度目だ。前は日本語学校にいた。やがて感染症が広がり、家から何度も帰国を促された。'),
      t('你回国。做过日语客服，也做过兼职。但你渐渐意识到，那不是自己想干一辈子的工作。于是你开始自学 IT。', '帰国し、日本語のカスタマーサポートやアルバイトを経験した。けれど、それを一生の仕事にはできないと思い、独学で IT を学び始めた。'),
      t('后来进了一家小公司。再后来，身体出了问题，公司也没能撑下去。你重新打开招聘网站，看到了一条赴日招聘。面试。通过。然后，你又回来了。', '小さな会社に入り、やがて体調を崩した。会社の経営も傾いた。もう一度求人サイトを開き、日本勤務の募集を見つけた。面接を受け、採用され、ここへ戻ってきた。'),
      t('东京没有欢迎你。它只是照常运行。', '東京は歓迎してくれなかった。ただ、いつもどおり動いていた。'),
    ],
    observer: [
      t('观测对象确认。', '観測対象を確認。'),
      t('人民币负债：¥100,000', '人民元建て負債：¥100,000'),
      t('当前可用资产：¥260,000 JPY', '現在の利用可能資産：¥260,000 JPY'),
      t('距离首次工资到账：约 34 天。', '初回給与の振込まで：約34日。'),
    ],
    onComplete: 'month-intro',
    options: [{ id: 'begin', label: t('开始', '始める') }],
  },
  {
    id: 'main-01-empty-room',
    title: t('房间里什么都没有', '何もない部屋'),
    category: 'life',
    month: 8,
    order: 1,
    text: [
      t('钥匙转动。门开了。', '鍵を回す。扉が開いた。'),
      t('房间里只有一盏顶灯、一台空调，和前一个住客留下的一道墙印。床、锅、桌子，都要从手里的钱里长出来。', '部屋にあるのは天井の灯りとエアコン、それから前の住人が残した壁の跡だけ。ベッドも鍋も机も、手元の金から生やさなければならない。'),
    ],
    options: [
      { id: 'buy-all', label: t('一次买齐，先让房间像个住处', '一度にそろえ、まず暮らせる部屋にする'), effects: { cashJpy: -35_000, mental: 5, lifePoverty: -2 }, response: [t('纸箱很快堆满玄关。钱少了一截，房间却终于像是有人住。', '玄関に段ボールが積まれた。金は減ったが、部屋はようやく人の暮らす場所になった。')] },
      { id: 'save-hard', label: t('能省就省，只买最低限度', 'できるだけ節約し、最低限だけ買う'), effects: { cashJpy: -18_000, mental: -3, lifePoverty: 2, stress: 1 }, response: [t('你坐在薄垫子上，告诉自己这只是暂时的。', '薄いマットに座り、これは一時的なものだと自分に言い聞かせた。')] },
      { id: 'essentials', label: t('先买最需要的，其余慢慢添', '必要なものから買い、残りは少しずつ'), effects: { cashJpy: -25_000, mental: 2 }, response: [t('锅里烧起第一壶水。还有很多空白，但今晚已经够了。', '鍋で最初の湯を沸かした。空白は多いが、今夜はこれで足りる。')] },
    ],
  },
  {
    id: 'main-02-new-project',
    title: t('新的现场', '新しい現場'),
    category: 'work',
    month: 8,
    order: 2,
    text: [
      t('Leader 把资料发给你。文件夹比你预想得更深。', 'リーダーから資料が届いた。フォルダーの階層は想像より深かった。'),
      t('「分からないことがあれば、何でも聞いてください。」', '「分からないことがあれば、何でも聞いてください。」'),
    ],
    observer: [t('字面：不懂的事情，什么都可以问。', '字義：分からないことは何でも質問してよい。'), t('实际执行方式：未知。', '実際の運用方法：不明。')],
    options: [
      { id: 'ask-everything', label: t('不懂就问', '分からなければ、その都度聞く'), effects: { tech: 1, workplace: 1 } },
      { id: 'research-alone', label: t('全部自己查', 'すべて自分で調べる'), effects: { tech: 3, actionPoints: -1, mental: -3, workTrust: 1, obsession: 1 } },
      { id: 'organize-questions', label: t('先整理，再集中确认', '整理してから、まとめて確認する'), effects: { tech: 2, workplace: 3, workTrust: 2, mental: -1 }, response: [t('你把已知、未知和自己的假设写成三列。Leader 回答得比想象中快。', '既知・未知・自分の仮説を三列に整理した。リーダーの回答は思ったより早かった。')] },
    ],
  },
  {
    id: 'main-03-impact-check',
    title: t('先调查一下', '一度、調べてみる'),
    category: 'work',
    month: 8,
    order: 3,
    text: [
      t('下午，聊天工具亮了一下。', '午後、チャットツールに通知が点いた。'),
      t('「こちら、影響範囲だけ一度確認してもらえますか？」', '「こちら、影響範囲だけ一度確認してもらえますか？」'),
      t('“只确认影响范围”听起来不多。但代码从来不按语气估算工时。', '「影響範囲だけ」と聞けば小さく思える。だが、コードは口調どおりの工数にはならない。'),
    ],
    options: [
      { id: 'requirements-only', label: t('只查需求写到的范围', '要件に書かれた範囲だけ確認する'), effects: { workTrust: 1, tech: 1 }, addFlags: ['possible_incomplete_impact_check'] },
      { id: 'understand-all', label: t('相关代码全部看懂', '関連コードをすべて理解する'), effects: { actionPoints: -2, tech: 4, mental: -4, obsession: 2 } },
      { id: 'finish-then-study', label: t('先完成调查，晚上再继续看', 'まず調査を終え、夜に続きを見る'), effects: { workTrust: 2, tech: 2, actionPoints: -1 }, addFlags: ['planned_evening_study'] },
    ],
  },
  {
    id: 'main-04-stomach',
    title: t('肚子有点不舒服', '少し、腹が痛い'),
    category: 'health',
    month: 8,
    order: 4,
    text: [
      t('夜里十一点，腹部传来熟悉的不适。', '午後十一時、腹に覚えのある違和感が走った。'),
      t('它还没有严重到让你停下。也正因为如此，你总能找到继续做事的理由。', '手を止めるほどではない。だからこそ、いつも続ける理由を見つけてしまう。'),
    ],
    observer: [t('观测对象存在不适。一般建议：休息；持续或加重时，向医疗专业人员咨询。', '観測対象に不調あり。一般的な対応：休息。継続または悪化する場合は医療専門家へ相談。')],
    options: [
      { id: 'sleep-early', label: t('早点休息', '早めに休む'), effects: { actionPoints: -1, health: 4, mental: 4, recoveryDebt: -2 } },
      { id: 'keep-coding', label: t('继续看代码', 'コードを読み続ける'), effects: { actionPoints: -1, tech: 2, health: -3, mental: -3, recoveryDebt: 2, obsession: 1 } },
      { id: 'search-everything', label: t('疯狂查资料', '不安のまま検索を続ける'), effects: { mental: -4, stress: 2, observerActivity: 2 }, response: [t('搜索结果从普通不适一路滑向最坏的可能。你没有得到结论，只多开了十七个标签页。', '検索結果は、よくある不調から最悪の可能性へ滑っていった。結論は出ず、タブだけが十七枚増えた。')] },
    ],
  },
  {
    id: 'main-05-money',
    title: t('钱走得比想象快', '金は思ったより早く消える'),
    category: 'finance',
    month: 8,
    order: 5,
    text: [
      t('银行余额没有出错。只是每一笔“必要”加在一起，比记忆里的数字更大。', '口座残高は間違っていない。ただ、一つひとつの「必要」を足すと、記憶の中の数字より大きくなる。'),
      t('信用卡 7 天后还款。', 'クレジットカードの支払日まで、あと7日。'),
    ],
    options: [
      { id: 'exchange-now', label: t('现在换汇，先准备最低还款', '今すぐ両替し、最低返済分を準備する'), effects: { debtStress: -2 }, addFlags: ['prepared_minimum_payment'] },
      { id: 'wait-rate', label: t('再等等汇率', 'もう少し為替を待つ'), effects: { stress: 1 } },
      { id: 'avoid', label: t('先不看', '今は見ない'), effects: { stress: 3, debtStress: 3 }, response: [t('你把银行应用划走。数字没有消失，只是暂时不在屏幕上。', '銀行アプリを閉じた。数字は消えず、画面から見えなくなっただけだった。')] },
    ],
  },
  {
    id: 'main-06-late',
    title: t('今日はもう遅いですね', '今日はもう遅いですね'),
    category: 'work',
    month: 8,
    order: 6,
    text: [
      t('办公室里只剩几块屏幕还亮着。Leader 看了一眼时间。', 'オフィスには、まだ数枚の画面だけが光っている。リーダーが時計を見た。'),
      t('「今日はもう遅いですね。」', '「今日はもう遅いですね。」'),
    ],
    observer: [t('可能含义：①今天很晚了　②可以下班了　③注意工作时间。无法确定。', '想定される意味：①今日は遅い　②退勤してよい　③勤務時間への注意。特定不能。')],
    options: [
      { id: 'leave', label: t('「お先に失礼します。」', '「お先に失礼します。」'), effects: { mental: 3, recoveryDebt: -1, workplace: 1 } },
      { id: 'keep-working', label: t('「まだ大丈夫です。」', '「まだ大丈夫です。」'), effects: { tech: 1, workTrust: 1, actionPoints: -1, mental: -3, health: -1 } },
      { id: 'finish-check', label: t('「ここまで確認してから帰ります。」', '「ここまで確認してから帰ります。」'), effects: { workTrust: 2, workplace: 2, mental: -1 } },
      { id: 'sword', label: t('偶有三尺剑，跨海斩长鲸。', '心中の三尺の剣で、海を越え長鯨を斬る。'), effects: { workTrust: 2, workplace: 2, stress: -1 }, addFlags: ['fantasy_sword'], fantasy: true, response: [t('你在心中拔剑。剑气横贯办公室，天地寂静。', '心の中で剣を抜いた。剣気がオフィスを貫き、天地は静まり返った。'), t('然后你说：「ここまで確認してから帰ります。」', 'そして言った。「ここまで確認してから帰ります。」'), t('【观测者】未检测到剑类武器。', '【観測者】剣類の武器は検出されませんでした。')] },
    ],
  },
  {
    id: 'main-07-dinner',
    title: t('同事吃饭', '同僚との食事'),
    category: 'social',
    month: 8,
    order: 7,
    text: [
      t('同事问你，要不要一起去吃点东西。', '同僚に、これから何か食べに行かないかと誘われた。'),
      t('你并不讨厌他们。只是一天的日语已经把电量用得差不多了。', '彼らが嫌いなわけではない。ただ、一日分の日本語で、もう電池が残り少ない。'),
    ],
    options: [
      { id: 'join', label: t('去', '行く'), effects: { cashJpy: -4_000, socialBattery: -10, mental: 2, workplace: 1 } },
      { id: 'decline', label: t('不去，回家安静待着', '断って、静かに帰る'), effects: { socialBattery: 5 } },
      { id: 'brief-join', label: t('去一会儿，早点离开', '少しだけ参加し、早めに帰る'), effects: { cashJpy: -2_500, socialBattery: -5, workplace: 1, mental: 1 }, addFlags: ['soft_boundary_attempt'] },
    ],
  },
  {
    id: 'main-08-evening-study',
    title: t('今晚原本想学习', '今夜は勉強するつもりだった'),
    category: 'life',
    month: 8,
    order: 8,
    conditions: [{ type: 'flag', flag: 'planned_evening_study' }],
    text: [
      t('回到房间，你想起白天留给自己的那句：“晚上再看。”', '部屋に戻り、昼間の自分が残した「夜に続きを見る」を思い出した。'),
      t('电脑在桌上。床也在。娱乐应用知道你今天很累。', '机にはパソコンがある。ベッドもある。娯楽アプリは、今日の疲れをよく知っている。'),
    ],
    options: [
      { id: 'study', label: t('继续看代码', 'コードの続きを読む'), effects: { actionPoints: -1, tech: 3, mental: -3, obsession: 1 } },
      { id: 'play', label: t('玩一会儿', '少し遊ぶ'), effects: { actionPoints: -1, mental: 3, lossOfControl: 1 }, consequences: [{ conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 34 }], chance: 0.65, effects: { recoveryDebt: 2, mental: -2, lossOfControl: 1 }, addFlags: ['played_until_late'], response: [t('你原本只想玩一个小时。回过神的时候，已经凌晨两点。', '一時間だけのつもりだった。気づけば午前二時だった。'), t('今晚的副业计划没有开始。', '今夜の計画は、始まらなかった。')] }] },
      { id: 'sleep', label: t('睡觉', '寝る'), effects: { health: 3, mental: 5, recoveryDebt: -2 }, response: [t('【观测者】今日技术成长：0。', '【観測者】本日の技術成長：0。'), t('闭嘴。', '黙れ。')] },
    ],
  },
  {
    id: 'main-09-month-end',
    title: t('第一月结束', '最初の月が終わる'),
    category: 'main',
    month: 8,
    order: 9,
    text: [
      t('日历翻过最后一页。你没有倒下，也还没有真正站稳。', 'カレンダーの最後の一枚をめくった。倒れはしなかった。だが、まだ足元は定まっていない。'),
      t('这个月留下的，不只是余额。还有你问过的问题、忍住的话、熬过的夜，以及没有熬的夜。', '残ったのは残高だけではない。尋ねたこと、飲み込んだ言葉、起きていた夜、そして眠ることを選んだ夜。'),
    ],
    observer: [t('本月结束。距离第一次工资到账：4 天。', '今月終了。初回給与の振込まで：4日。'), t('薪资支付规则：次月支付上月工资。', '給与支払規則：前月分を翌月に支給。')],
    onComplete: 'month-summary',
    options: [{ id: 'close-month', label: t('翻到账簿', '帳簿を開く') }],
  },
] as const

export const firstMonthEventMap = new Map(firstMonthEvents.map((event) => [event.id, event]))
