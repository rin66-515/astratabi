import type { LocalizedText, MiniGameConfig } from '../types/game'

const text = (zh: string, ja: string): LocalizedText => ({ zh, ja })

export const READ_THE_AIR_CONFIG_ID = 'read-the-air-v1'
export const INCIDENT_RESPONSE_CONFIG_ID = 'incident-response-v1'
export const DESIGN_REVIEW_CONFIG_ID = 'design-review-v1'

export const readTheAirConfig: MiniGameConfig = {
  id: READ_THE_AIR_CONFIG_ID,
  type: 'read_the_air',
  title: text('会社读空气', '会社の空気を読む'),
  resultTitle: text('会议散了', '会議が終わった'),
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
  results: {
    S: {
      effects: { workplace: 5, boundary: 3, workTrust: 2, mental: 1 },
      flags: ['read_air_completed', 'read_air_clear'],
      resultText: text('你没有猜中所有人的心思。你只是让没说出口的事，变成了可以确认的事。', '全員の本音を当てたわけではない。言葉になっていないことを、確認できることに変えただけだ。'),
    },
    A: {
      effects: { workplace: 3, boundary: 2, workTrust: 2 },
      flags: ['read_air_completed', 'read_air_steady'],
      resultText: text('大部分含糊都被你问清。会议没有漂亮结束，但工作能够继续。', '曖昧な部分の多くを確認できた。きれいな終わり方ではなくても、仕事は続けられる。'),
    },
    B: {
      effects: { workplace: 1, stress: 1 },
      flags: ['read_air_completed'],
      resultText: text('你读懂了一部分，也承担了一部分没有确认的内容。至少没有完全失去方向。', '一部は読み取れたが、確認しないまま引き受けた部分もある。それでも、完全に方向を失うことはなかった。'),
    },
    C: {
      effects: { workplace: -1, mental: -2, stress: 4, recoveryDebt: 2 },
      flags: ['read_air_completed', 'read_air_overcommitted'],
      resultText: text('会议结束了，真正的任务却留到会后才靠猜测成形。', '会議は終わった。本当のタスクは、会議後に推測で形になった。'),
    },
    D: {
      effects: { workplace: -2, mental: -4, stress: 7, recoveryDebt: 4, lossOfControl: 2 },
      flags: ['read_air_completed', 'read_air_timed_out'],
      resultText: text('你一直在等一句明确的话。最后，沉默替所有人做了决定。', '明確な一言を待ち続けた。最後は、沈黙が全員の代わりに決めた。'),
    },
  },
}

export const incidentResponseConfig: MiniGameConfig = {
  id: INCIDENT_RESPONSE_CONFIG_ID,
  type: 'incident_response',
  title: text('项目炎上', '障害対応'),
  resultTitle: text('火势暂稳', '一次対応完了'),
  stages: [
    {
      id: 'incident-triage',
      speaker: text('客户消息', '利用者からの連絡'),
      prompt: [
        text('“链接能打开，但下载到一半就停了。已经试了两次。”', '「リンクは開けますが、ダウンロードが途中で止まります。二回試しました」'),
        text('后台同时出现三条失败记录。还不知道是单个客户，还是所有交付。', '管理画面には同時に三件の失敗記録がある。一人だけか、すべての納品に影響するかはまだ分からない。'),
      ],
      timeLimitMs: 15_000,
      timeout: {
        score: 0,
        resultText: text('你盯着日志寻找答案。第四条失败记录先出现了。', 'ログの中に答えを探している間に、四件目の失敗が先に現れた。'),
      },
      options: [
        {
          id: 'confirm-impact',
          label: text('确认发生时间、对象和复现路径，先判断影响范围', '発生時刻、対象、再現手順を確認し、まず影響範囲を判断する'),
          response: text('失败集中在同一版本的压缩包，其他交付仍可正常下载。', '失敗は同じ版のZIPに集中し、ほかの納品は正常にダウンロードできている。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'restart-first',
          label: text('先重启服务，再看错误会不会消失', '先にサービスを再起動し、エラーが消えるかを見る'),
          response: text('服务恢复得很快。相同下载仍在相同位置失败。', 'サービスはすぐ戻った。同じダウンロードは、同じ場所で再び失敗した。'),
          score: 1,
        },
        {
          id: 'assume-client-network',
          label: text('先判断是客户网络问题，请对方再试一次', '利用者側の回線と判断し、もう一度試してもらう'),
          response: text('对方第三次失败。新的失败记录也来自另一名客户。', '三回目も失敗した。別の利用者からも新しい失敗記録が上がった。'),
          score: 0,
        },
      ],
    },
    {
      id: 'incident-containment',
      speaker: text('处理窗口', '対応窓口'),
      prompt: [
        text('问题定位到损坏的交付文件。旧文件仍在被专属链接引用。', '破損した納品ファイルが原因と分かった。専用リンクはまだ旧ファイルを参照している。'),
        text('客户正在等待。后台操作也没有“事故模式”。', '利用者は待っている。管理画面にも「障害モード」はない。'),
      ],
      timeLimitMs: 12_000,
      timeout: {
        score: 0,
        resultText: text('没有人宣布停止发放。客服又复制出一条指向旧文件的链接。', '配布停止を宣言する人はいない。サポートは旧ファイルを指すリンクをもう一件発行した。'),
      },
      options: [
        {
          id: 'contain-and-communicate',
          label: text('暂停该版本发放，告知影响范围和临时处理办法', '該当版の配布を止め、影響範囲と暫定対応を共有する'),
          response: text('新增链接停止。客服知道该对谁解释、先提供什么。', '新規リンクの発行が止まった。サポートも、誰に何を先に案内すべきか分かった。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'replace-silently',
          label: text('悄悄替换文件，等确认成功后再说明', 'ファイルを黙って差し替え、成功確認後に説明する'),
          response: text('新下载成功了。客服仍不知道前面几次失败应该怎样记录。', '新しいダウンロードは成功した。だが、先ほどまでの失敗をどう記録するか、サポートには分からない。'),
          score: 1,
        },
        {
          id: 'broadcast-guess',
          label: text('先群发“可能是服务器故障”', '先に「サーバー障害の可能性」と全体連絡する'),
          response: text('消息传得比调查快。没有受影响的人也开始重新尝试下载。', '調査より連絡の方が速く広がった。影響のない人まで再ダウンロードを始めた。'),
          score: 0,
        },
      ],
    },
    {
      id: 'incident-closure',
      speaker: text('恢复确认', '復旧確認'),
      prompt: [
        text('替换文件已生成，接口返回正常。', '差し替えファイルが生成され、APIも正常応答している。'),
        text('现在可以结束处理，也可以从客户实际路径再走一遍。', 'ここで対応を終えることも、利用者と同じ経路をもう一度たどることもできる。'),
      ],
      timeLimitMs: 10_000,
      timeout: {
        score: 0,
        resultText: text('监控没有再报错。是否真的恢复，只能等下一位客户替你验证。', '監視には新しいエラーがない。本当に復旧したかは、次の利用者が代わりに確かめることになる。'),
        completesMiniGame: true,
      },
      options: [
        {
          id: 'verify-and-record',
          label: text('按客户路径验证，记录时间线、原因和后续担当', '利用者経路で確認し、時系列・原因・後続担当を記録する'),
          response: text('下载完整结束。处理记录里第一次留下了“下次怎样更早发现”。', 'ダウンロードは最後まで完了した。対応記録に初めて「次はどう早く気づくか」が残った。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'close-on-health',
          label: text('健康检查正常，先关闭事故', 'ヘルスチェックが正常なので、障害対応を終了する'),
          response: text('系统活着。客户能否完成下载，没有人在这个时刻再次确认。', 'システムは動いている。利用者が完了できるかは、この時点では再確認されなかった。'),
          score: 1,
        },
        {
          id: 'perfect-it-alone',
          label: text('不通知任何人，独自把所有相关代码都检查完', '誰にも知らせず、関連コードを一人ですべて確認する'),
          response: text('夜越来越深。事故没有扩大，你的检查范围却一直在扩大。', '夜が深くなる。障害は広がらないが、確認範囲だけが広がり続けた。'),
          score: 0,
        },
      ],
    },
  ],
  results: {
    S: {
      effects: { product: 5, tech: 3, workTrust: 3, boundary: 1, stress: 1 },
      flags: ['incident_response_completed', 'incident_response_controlled'],
      resultText: text('你修好的不只是文件。影响范围、客户说明和下一次预防，也第一次被放进同一条处理线上。', '直したのはファイルだけではない。影響範囲、利用者説明、再発防止が初めて一本の対応線に乗った。'),
    },
    A: {
      effects: { product: 3, tech: 2, workTrust: 2, stress: 1 },
      flags: ['incident_response_completed', 'incident_response_recovered'],
      resultText: text('服务恢复，客户也得到说明。还有几处记录不够完整，但事故没有继续失控。', 'サービスは復旧し、利用者への説明もできた。記録に不足はあるが、障害はこれ以上広がらなかった。'),
    },
    B: {
      effects: { product: 1, tech: 1, stress: 3, recoveryDebt: 1 },
      flags: ['incident_response_completed'],
      resultText: text('问题解决了。过程里有几次靠运气，但结果没有再交给下一位客户验证。', '問題は解決した。途中に運任せの場面はあったが、結果を次の利用者に試させずに済んだ。'),
    },
    C: {
      effects: { product: -1, workTrust: -1, mental: -2, stress: 6, recoveryDebt: 3, lossOfControl: 1 },
      flags: ['incident_response_completed', 'incident_response_unclear'],
      resultText: text('文件最终能下载了。谁受过影响、为什么发生、是否还会再来，都没有完全说清。', '最終的にダウンロードはできた。誰が影響を受け、なぜ起き、再発するかは十分に整理されなかった。'),
    },
    D: {
      effects: { product: -3, workTrust: -2, health: -2, mental: -4, stress: 9, recoveryDebt: 5, lossOfControl: 2 },
      flags: ['incident_response_completed', 'incident_response_lost_control'],
      resultText: text('系统恢复得比处理过程更早。没有清晰记录的事故，只是暂时停止发生。', 'システムは対応より先に戻った。記録されない障害は、ただ一時的に止まっただけだ。'),
    },
  },
}

export const designReviewConfig: MiniGameConfig = {
  id: DESIGN_REVIEW_CONFIG_ID,
  type: 'design_review',
  title: text('设计书找茬', '設計書レビュー'),
  resultTitle: text('指摘已落笔', '指摘記録完了'),
  stages: [
    {
      id: 'review-requirement-trace',
      speaker: text('基本设计书', '基本設計書'),
      prompt: [
        text('画面项定义写着“符合条件时显示”。条件没有编号，也没有出处。', '画面項目定義には「条件を満たす場合に表示」とある。条件番号も根拠もない。'),
        text('实现人员问：“这个条件，到底在哪一页？”', '実装担当者が聞く。「その条件は、どのページにありますか」'),
      ],
      timeLimitMs: 14_000,
      timeout: {
        score: 0,
        resultText: text('你继续翻页。实现人员把问题写进了自己的备忘录。', 'ページをめくり続けた。実装担当者は、自分のメモに疑問を書き残した。'),
      },
      options: [
        {
          id: 'trace-source',
          label: text('追溯要件、业务规则与表示条件，补上参照关系', '要件・業務ルール・表示条件を追跡し、参照関係を補う'),
          response: text('条件来自一条会议确认事项，不在原要件正文里。你先把事实和待确认部分分开。', '条件は要件本文ではなく、会議の確認事項にあった。事実と未確認部分を分けて整理した。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'write-assumption',
          label: text('按现状写一个想定条件，之后再向客户确认', '現時点の想定条件を書き、あとで顧客確認する'),
          response: text('设计书终于有了条件。但“之后确认”还没有负责人和期限。', '設計書には条件が入った。ただし「後で確認」には担当者も期限もない。'),
          score: 1,
        },
        {
          id: 'mark-all-tbd',
          label: text('统一标成 TBD，先把评审继续下去', '一律TBDにして、レビューを先へ進める'),
          response: text('页面变得整齐。未决事项也变得看不出轻重。', 'ページは整った。未決事項の重さも見分けにくくなった。'),
          score: 0,
        },
      ],
    },
    {
      id: 'review-cross-layer',
      speaker: text('接口与数据库', 'APIとデータベース'),
      prompt: [
        text('画面写“取消后可重新申请”，API却只有更新状态，DB状态迁移也没有回到申请中的路径。', '画面には「取消後に再申請可能」とあるが、APIは状態更新だけで、DB状態遷移にも申請中へ戻る経路がない。'),
        text('三份设计书，各自都能读通。合在一起却不是同一个系统。', '三つの設計書は、それぞれ読める。合わせると、同じシステムになっていない。'),
      ],
      timeLimitMs: 12_000,
      timeout: {
        score: 0,
        resultText: text('评审继续到下一页。矛盾被留给结合测试发现。', 'レビューは次のページへ進んだ。矛盾は結合テストで見つかることになった。'),
      },
      options: [
        {
          id: 'build-consistency-path',
          label: text('按业务流程核对画面、API、状态迁移和DB更新', '業務フローに沿って、画面・API・状態遷移・DB更新を照合する'),
          response: text('缺少的是“重新申请”命令，不是一行状态值。影响范围被明确到四份设计书。', '不足していたのは一行の状態値ではなく「再申請」コマンドだった。影響範囲は四つの設計書に特定された。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'fix-screen-only',
          label: text('先修改画面文言，避免承诺尚未设计的功能', 'まず画面文言を直し、未設計機能を約束しないようにする'),
          response: text('矛盾暂时消失了。业务是否真的不需要重新申请，仍没有结论。', '矛盾はいったん消えた。業務上、本当に再申請が不要かは未決のままだ。'),
          score: 1,
        },
        {
          id: 'treat-as-detail',
          label: text('判断为详细设计阶段再处理', '詳細設計で対応する事項と判断する'),
          response: text('问题被向下游移动。实装人员得到的上游判断仍然是空白。', '問題は下流へ移された。実装担当者が必要とする上流判断は空白のままだ。'),
          score: 0,
        },
      ],
    },
    {
      id: 'review-close-findings',
      speaker: text('Review 记录', 'レビュー記録'),
      prompt: [
        text('评审结束前，桌上留下九条指摘。', 'レビュー終了前、九件の指摘が残った。'),
        text('如果全部写成“修正”，明天谁也不知道应该先处理哪一条。', 'すべて「修正」と書けば、明日、誰も優先順位を判断できない。'),
      ],
      timeLimitMs: 10_000,
      timeout: {
        score: 0,
        resultText: text('会议时间到了。九条指摘都带着同一个状态离开会议室。', '会議時間が終わった。九件すべてが同じステータスのまま会議室を出た。'),
        completesMiniGame: true,
      },
      options: [
        {
          id: 'classify-and-own',
          label: text('区分缺陷、确认事项和建议，并明确担当与期限', '不備・確認事項・提案を分け、担当と期限を明確にする'),
          response: text('九条指摘变成三类。必须阻止实装的两条，被放到了最前面。', '九件は三種類に分かれた。実装を止めるべき二件が、最上位に置かれた。'),
          score: 3,
          tone: 'realistic',
        },
        {
          id: 'promise-all-tonight',
          label: text('全部认领，今晚统一修完', 'すべて引き取り、今夜中にまとめて直す'),
          response: text('会议很快结束。九条问题和今夜的时间，全都只剩你来分配。', '会議は早く終わった。九件の問題と今夜の時間は、すべて自分一人で配分することになった。'),
          score: 1,
        },
        {
          id: 'defend-document',
          label: text('逐条解释为什么原设计也能成立', '現行設計でも成立する理由を一件ずつ説明する'),
          response: text('解释越来越完整。指摘是否被解决，反而越来越模糊。', '説明は詳しくなった。指摘が解決したかどうかは、かえって曖昧になった。'),
          score: 0,
        },
      ],
    },
  ],
  results: {
    S: {
      effects: { tech: 4, workplace: 4, product: 3, workTrust: 2, boundary: 1 },
      flags: ['design_review_completed', 'design_review_traceable'],
      resultText: text('你找出的不是错别字，而是实现会走向不同答案的地方。设计书开始真正承担传递判断的责任。', '見つけたのは誤字ではなく、実装が別の答えへ進む箇所だった。設計書が判断を伝える役割を持ち始めた。'),
    },
    A: {
      effects: { tech: 3, workplace: 3, product: 2, workTrust: 1 },
      flags: ['design_review_completed', 'design_review_actionable'],
      resultText: text('主要矛盾被找到，也有人负责关闭。还有少量想定需要客户确认，但实装不会再靠猜。', '主な矛盾は見つかり、クローズ担当も決まった。顧客確認は残るが、実装が推測だけに頼ることはない。'),
    },
    B: {
      effects: { tech: 2, workplace: 1, stress: 1 },
      flags: ['design_review_completed'],
      resultText: text('评审发现了一些问题。重要指摘和普通修正仍混在一起，需要会后再整理。', 'いくつかの問題は見つかった。重要指摘と通常修正はまだ混在し、会議後の整理が必要だ。'),
    },
    C: {
      effects: { workplace: -1, mental: -2, stress: 4, recoveryDebt: 2 },
      flags: ['design_review_completed', 'design_review_unresolved'],
      resultText: text('页面被修得更整齐，系统之间的矛盾却还留在不同文件里。', 'ページは整ったが、システム間の矛盾は別々のファイルに残った。'),
    },
    D: {
      effects: { workplace: -3, workTrust: -2, mental: -3, stress: 7, recoveryDebt: 4, lossOfControl: 1 },
      flags: ['design_review_completed', 'design_review_missed'],
      resultText: text('评审按时结束。真正的问题没有消失，只是从设计阶段继续向下游走。', 'レビューは時間どおり終わった。本当の問題は消えず、設計工程から下流へ進み続けた。'),
    },
  },
}

export const miniGameConfigs = new Map<string, MiniGameConfig>([
  [readTheAirConfig.id, readTheAirConfig],
  [incidentResponseConfig.id, incidentResponseConfig],
  [designReviewConfig.id, designReviewConfig],
])
