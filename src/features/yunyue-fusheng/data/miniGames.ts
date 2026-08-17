import type { LocalizedText, MiniGameConfig, MiniGameType } from '../types/game'

const text = (zh: string, ja: string): LocalizedText => ({ zh, ja })

export const READ_THE_AIR_CONFIG_ID = 'read-the-air-v1'

export const readTheAirConfig: MiniGameConfig = {
  id: READ_THE_AIR_CONFIG_ID,
  type: 'read_the_air',
  stages: [
    {
      id: 'meeting-close',
      speaker: text('课长', '課長'),
      prompt: [
        text('“今天到这里也可以。只是明天一早，客户可能会问这页。”', '「今日はここまででもいい。ただ、明日の朝一で、お客様がこのページを聞くかもしれない」'),
        text('他说完以后，没有宣布散会。', 'そう言ったあと、会議終了の言葉はなかった。'),
      ],
      timeLimitMs: 12_000,
      timeout: {
        score: 0,
        resultText: text('你在沉默中错过了第一个确认窗口。课长把视线转向前辈。', '沈黙のまま、最初の確認機会を逃した。課長の視線は先輩へ移った。'),
      },
      options: [
        {
          id: 'confirm-decision',
          label: text('确认：今晚需要决定的是内容，还是只要明确明早的担当？', '確認する。今夜必要なのは内容の確定か、それとも明朝の担当を決めることか'),
          response: text('问题被拆开以后，课长说明今晚只需确定担当和确认点。', '問いを分けると、課長は今夜必要なのは担当と確認点の整理だけだと説明した。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'volunteer-tonight',
          label: text('直接表示今晚会全部确认完', '今夜中にすべて確認すると申し出る'),
          response: text('没人反对。会议也因此默认多出了一项今晚的工作。', '反対する人はいない。会議には、今夜の作業が一つ追加された。'),
          score: 1,
        },
        {
          id: 'assume-dismissed',
          label: text('把“到这里”理解成散会，开始收拾', '「ここまで」を終了と受け取り、片付け始める'),
          response: text('拉链声在安静的会议室里格外明显。', '静かな会議室に、鞄のファスナー音だけが大きく響いた。'),
          score: 0,
        },
      ],
    },
    {
      id: 'morning-review',
      speaker: text('前辈', '先輩'),
      prompt: [
        text('前辈翻到下一页：“这个资料，明早能看吗？”', '先輩が次のページを開く。「この資料、明日の朝に見られる？」'),
        text('资料是谁来改、看到什么程度，都没有说。', '誰が直すのか、どの完成度を求めるのかは言われていない。'),
      ],
      timeLimitMs: 10_000,
      timeout: {
        score: 0,
        resultText: text('你没有回答。前辈说：“那我先按你会处理来理解。”', '答えないままでいると、先輩は「じゃあ、対応してくれる前提で考えるね」と言った。'),
      },
      options: [
        {
          id: 'confirm-owner-and-done',
          label: text('确认担当、完成标准与明早确认时间', '担当、完了条件、明朝の確認時刻を確認する'),
          response: text('前辈说出真正需要的两处修改，并约好九点十五分一起确认。', '先輩は本当に必要な二点を示し、九時十五分に一緒に確認することになった。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'say-can-do',
          label: text('先回答“可以”，细节之后再确认', '先に「できます」と答え、詳細はあとで確認する'),
          response: text('“可以”被记录下来。没有被记录的部分，仍由你自己猜。', '「できます」だけが残った。残りは、まだ自分で推測するしかない。'),
          score: 1,
        },
        {
          id: 'say-not-mine',
          label: text('指出这不是自己的担当', '自分の担当ではないと指摘する'),
          response: text('事实没有错。前辈问：“所以你觉得应该找谁？”', '事実としては間違っていない。先輩は「では、誰に頼むべきだと思う？」と聞いた。'),
          score: 0,
        },
      ],
    },
    {
      id: 'leave-or-stay',
      speaker: text('会议室', '会議室'),
      prompt: [
        text('需要确认的事项已经列清。课长合上电脑，前辈仍坐着。', '確認事項は整理された。課長はパソコンを閉じたが、先輩はまだ座っている。'),
        text('这一次，没有人再说“可以走了”。', '今度は、誰も「帰っていい」とは言わない。'),
      ],
      timeLimitMs: 8_000,
      timeout: {
        score: 0,
        resultText: text('你继续坐着。几分钟后，会议自然变成了加班。', 'そのまま座り続けた。数分後、会議は自然に残業へ変わっていた。'),
        completesMiniGame: true,
      },
      options: [
        {
          id: 'summarize-and-leave',
          label: text('复述担当和明早确认点，告知自己先下班', '担当と明朝の確認点を復唱し、先に退勤すると伝える'),
          response: text('前辈点头：“嗯，明天见。”会议真的结束了。', '先輩はうなずいた。「うん、また明日」。会議は本当に終わった。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'wait-for-senior',
          label: text('等前辈起身后再一起走', '先輩が立つまで待ち、一緒に出る'),
          response: text('你们一起离开了。只是那段等待没有产生新的决定。', '一緒に会議室を出た。ただ、待っていた時間に新しい決定は生まれなかった。'),
          score: 1,
        },
        {
          id: 'declare-jianghu',
          label: text('抱拳：诸位，明日辰时再议', '一礼して告げる。「皆の者、続きは明朝に」'),
          response: text('没人完全听懂。至少所有人都知道你准备离开。', '完全に理解した人はいない。少なくとも、帰るつもりだということは伝わった。'),
          score: 1,
          tone: 'jianghu',
        },
      ],
    },
  ],
}

export const miniGameConfigs = new Map<string, MiniGameConfig>([
  [readTheAirConfig.id, readTheAirConfig],
])

export const miniGamePlaceholders: readonly {
  type: MiniGameType
  configId: string
  status: 'placeholder'
}[] = [
  { type: 'incident_response', configId: 'incident-response-placeholder', status: 'placeholder' },
  { type: 'design_review', configId: 'design-review-placeholder', status: 'placeholder' },
]
