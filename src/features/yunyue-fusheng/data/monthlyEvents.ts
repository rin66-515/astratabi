import type { LocalizedText, MonthlyEventDefinition } from '../types/game'

const text = (zh: string, ja: string): LocalizedText => ({ zh, ja })

export const monthlyEventDefinitions: readonly MonthlyEventDefinition[] = [
  {
    kind: 'minigame',
    event: {
      id: 'monthly-work-scope-creep',
      title: text('“顺便再确认一下”', '「ついでに、もう一つだけ」'),
      category: 'work',
      text: [
        text('快下班时，前辈把一份不在你担当范围内的资料放到桌边。', '退勤間際、先輩が担当外の資料を机の端に置いた。'),
        text('“不急。明早之前顺便确认一下就好。”', '「急ぎじゃない。明日の朝までに、ついでに見ておいて」'),
        text('不急和明早，落在同一句话里。', '「急ぎではない」と「明日の朝まで」が、同じ一文に並んでいる。'),
      ],
      weight: 1.1,
      conditions: [{ type: 'elapsedMonth', operator: 'gte', value: 2 }],
      miniGame: { type: 'design_review', configId: 'design-review-v1' },
      options: [
        {
          id: 'clarify-scope',
          tone: 'realistic',
          label: text('确认优先级、范围和明早需要的完成度', '優先順位と範囲、明朝までに必要な完成度を確認する'),
          effects: { workplace: 2, workTrust: 2, boundary: 2, stress: -1 },
          addFlags: ['work_scope_clarified'],
          response: [text('你把“顺便”拆成三个可以回答的问题。对方停了一下，重新说明了真正需要的部分。', '「ついで」を三つの確認事項に分けた。相手は少し止まり、本当に必要な範囲を言い直した。')],
        },
        {
          id: 'take-it-home',
          label: text('先答应，晚上带回去看', 'ひとまず引き受け、夜に持ち帰って見る'),
          effects: { workTrust: 2, stress: 5, recoveryDebt: 3, obsession: 2 },
          response: [text('“没问题”比判断更快出口。电车里，你一直想着还没打开的文件。', '判断より先に「大丈夫です」が出た。電車の中でも、まだ開いていない資料が頭から離れなかった。')],
        },
        {
          id: 'refuse-bluntly',
          tone: 'jianghu',
          label: text('把资料推回去：此事不在在下今日行程', '資料を戻す。「本日の拙者の行程にはござらぬ」'),
          effects: { boundary: 4, workplace: -3, socialBattery: -1 },
          response: [text('边界是守住了。空气也确实静了几秒。', '境界線は守れた。空気も、確かに数秒止まった。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'workTrust', operator: 'gte', value: 25 }], multiplier: 1.8 },
      { conditions: [{ type: 'stat', stat: 'obsession', operator: 'gte', value: 45 }], multiplier: 1.5 },
    ],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-work-quiet-overtime',
      title: text('大家都还没走', '誰もまだ帰らない'),
      category: 'work',
      text: [
        text('十八点三十分。今天的任务已经完成。', '十八時三十分。今日の作業は終わっている。'),
        text('没有人要求加班，但办公室里也没有人起身。', '残業を命じる人はいない。それでも、立ち上がる人もいない。'),
      ],
      weight: 1,
      conditions: [{ type: 'elapsedMonth', operator: 'gte', value: 2 }],
      options: [
        {
          id: 'report-and-leave',
          tone: 'realistic',
          label: text('发出今日进度和明日计划，正常下班', '本日の進捗と明日の予定を共有し、退勤する'),
          effects: { boundary: 3, workplace: 2, mental: 2, stress: -2 },
          addFlags: ['left_after_status_report'],
          response: [text('你没有解释为什么要走，只说明事情已经走到哪里。', 'なぜ帰るかは説明せず、仕事がどこまで進んだかだけを伝えた。')],
        },
        {
          id: 'wait-with-everyone',
          label: text('再坐一会儿，等第一个人离开', '最初の一人が帰るまで、もう少し座る'),
          effects: { workplace: 1, stress: 4, recoveryDebt: 2, socialBattery: -2 },
          response: [text('二十分钟后终于有人合上电脑。你甚至不记得这二十分钟做了什么。', '二十分後、ようやく誰かがパソコンを閉じた。その二十分に何をしたかは、よく覚えていない。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'boundary', operator: 'lt', value: 25 }], multiplier: 2 },
      { conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 65 }], multiplier: 1.5 },
    ],
  },
  {
    kind: 'minigame',
    event: {
      id: 'monthly-work-read-the-air',
      title: text('会社读空气', '会社の空気を読む'),
      category: 'work',
      text: [
        text('定例会已经超过预定时间。课长看了一眼时钟，说：“今天到这里也可以。”', '定例会は予定時間を過ぎた。課長は時計を見て、「今日はここまででもいい」と言った。'),
        text('没人收拾东西。前辈却把视线落在了你负责的那一页。', '誰も片付けない。先輩の視線だけが、あなたの担当ページに落ちた。'),
        text('接下来的几句话，没有哪一句会把真正的问题直接说出来。', 'これから交わされる言葉のどれも、本当の問いを直接口にはしない。'),
      ],
      observer: [text('对话压力上升。回答窗口正在缩短。', '会話圧を検知。応答可能時間が短くなっている。')],
      weight: 0.75,
      conditions: [
        { type: 'elapsedMonth', operator: 'gte', value: 3 },
        { type: 'stat', stat: 'workplace', operator: 'gte', value: 18 },
      ],
      miniGame: { type: 'read_the_air', configId: 'read-the-air-v1' },
      options: [{
        id: 'enter-meeting',
        tone: 'realistic',
        label: text('先确认当前会议还需要决定什么', 'まず、この会議で残っている判断事項を確認する'),
        effects: { workplace: 1 },
        response: [text('你翻到自己的页面。会议室里的声音忽然都变得清楚。', '自分のページを開く。会議室の音が、急にはっきり聞こえ始めた。')],
      }],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'socialBattery', operator: 'lt', value: 40 }], multiplier: 1.7 },
      { conditions: [{ type: 'stat', stat: 'workTrust', operator: 'gte', value: 15 }], multiplier: 1.5 },
      { conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 70 }], multiplier: 1.4 },
    ],
  },
  {
    kind: 'major',
    event: {
      id: 'monthly-health-follow-up',
      title: text('复查通知', '再検査のお知らせ'),
      category: 'health',
      text: [
        text('信箱里有一封医院寄来的复查通知。', '郵便受けに、病院からの再検査案内が届いていた。'),
        text('它没有催促，只写着建议预约。你却把信封拿在手里站了很久。', '急かす文面ではなく、予約を勧めているだけだった。それでも封筒を持ったまま、しばらく立っていた。'),
      ],
      weight: 0.8,
      conditions: [
        { type: 'elapsedMonth', operator: 'gte', value: 4 },
        { type: 'stat', stat: 'health', operator: 'lt', value: 58 },
      ],
      options: [
        {
          id: 'book-appointment',
          tone: 'realistic',
          label: text('确认工作安排，当晚预约复查', '仕事の予定を確認し、その夜に再検査を予約する'),
          effects: { cashJpy: -8_000, health: 5, mental: 2, stress: -2, recoveryDebt: -2 },
          addFlags: ['health_follow_up_booked'],
          response: [text('预约完成后，问题并没有消失。但它终于有了日期。', '予約を終えても、問題は消えない。それでも、ようやく日付がついた。')],
        },
        {
          id: 'postpone-letter',
          label: text('先收进抽屉，等工作空一点再说', 'ひとまず引き出しにしまい、仕事が落ち着いてから考える'),
          effects: { stress: 4, recoveryDebt: 4, health: -3, lossOfControl: 1 },
          addFlags: ['health_follow_up_postponed'],
          response: [text('抽屉关上了。那封信却没有真的离开视线。', '引き出しは閉じた。けれど、あの封筒は視界から消えなかった。')],
        },
      ],
    },
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-health-late-screen',
      title: text('凌晨仍亮着的屏幕', '深夜も消えない画面'),
      category: 'health',
      text: [
        text('一点十二分。屏幕上只剩最后一个小问题。', '午前一時十二分。画面には、あと一つだけ小さな問題が残っている。'),
        text('你知道“最后一个”通常不会只有一个。', '「あと一つ」が一つで済まないことを、もう知っている。'),
      ],
      weight: 0.9,
      conditions: [{ type: 'elapsedMonth', operator: 'gte', value: 3 }],
      options: [
        {
          id: 'write-note-sleep',
          tone: 'realistic',
          label: text('留下明早的第一步，关机睡觉', '明朝の最初の一手だけ残し、電源を切って眠る'),
          effects: { stress: -4, recoveryDebt: -3, mental: 2, obsession: -1 },
          response: [text('问题还在，但今晚不再由你守着它。', '問題は残っている。でも今夜、それを見張り続けるのはやめた。')],
        },
        {
          id: 'finish-one-more',
          label: text('再做完这一点就睡', 'ここだけ終わらせてから眠る'),
          effects: { tech: 2, product: 1, stress: 4, recoveryDebt: 4, health: -2, obsession: 2 },
          response: [text('两点零七分，你又写下一个“明天再处理”。', '二時七分、また一つ「明日対応」と書き残した。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'obsession', operator: 'gte', value: 35 }], multiplier: 2 },
      { conditions: [{ type: 'stat', stat: 'recoveryDebt', operator: 'gte', value: 45 }], multiplier: 1.7 },
    ],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-life-laundry-rain',
      title: text('洗衣房的雨', 'コインランドリーの雨'),
      category: 'life',
      text: [
        text('周末下雨。房间里的衣服已经没有地方再挂。', '週末は雨。部屋には、もう洗濯物を干す場所がない。'),
        text('投币洗衣房的滚筒转着，玻璃上映出一个暂时不用回答任何人的你。', 'コインランドリーのドラムが回り、ガラスには、しばらく誰にも返事をしなくていい自分が映っている。'),
      ],
      weight: 1,
      options: [
        {
          id: 'finish-laundry',
          tone: 'realistic',
          label: text('把衣服洗完，顺便吃一顿热饭', '洗濯を終え、ついでに温かい食事を取る'),
          effects: { cashJpy: -2_000, health: 2, mental: 3, stress: -3, lifePoverty: -2 },
          response: [text('生活没有因此变好很多。至少今晚有干净衣服和热汤。', '暮らしが大きく変わるわけではない。それでも今夜は、乾いた服と温かい汁物がある。')],
        },
        {
          id: 'leave-it',
          label: text('太累了，先回去', '疲れたので、今日は帰る'),
          effects: { mental: 1, lifePoverty: 3 },
          response: [text('有些事被留到下周。不是解决，只是今天到此为止。', 'いくつかは来週へ送った。解決ではない。ただ、今日はここまでにした。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'lifePoverty', operator: 'gte', value: 30 }], multiplier: 2 },
      { conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 60 }], multiplier: 1.3 },
    ],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-life-closing-supermarket',
      title: text('超市闭店前', '閉店前のスーパー'),
      category: 'life',
      text: [
        text('闭店音乐响起时，便当贴上了半价标签。', '閉店の音楽が流れ、弁当に半額シールが貼られた。'),
        text('便宜、方便、今晚就能吃。货架另一边是需要自己处理的蔬菜和肉。', '安くて、手軽で、今夜すぐ食べられる。棚の向こうには、自分で調理する野菜と肉がある。'),
      ],
      weight: 1,
      options: [
        {
          id: 'buy-simple-meal',
          tone: 'realistic',
          label: text('买两天的简单食材，回去煮一锅', '二日分の簡単な食材を買い、帰って一鍋作る'),
          effects: { cashJpy: -3_500, health: 3, stress: -1, lifePoverty: -2 },
          response: [text('锅里冒出热气时，房间第一次像有人在这里生活。', '鍋から湯気が上がると、部屋に初めて人が暮らしている気配がした。')],
        },
        {
          id: 'discount-bento',
          label: text('拿一份半价便当', '半額弁当を一つ取る'),
          effects: { cashJpy: -700, mental: 1, lifePoverty: 1 },
          response: [text('这不是坏选择。只是最近，你做了很多次同样的选择。', '悪い選択ではない。ただ最近、同じ選択を何度もしている。')],
        },
      ],
    },
  },
  {
    kind: 'major',
    event: {
      id: 'monthly-institution-tax-letter',
      title: text('看不懂也必须处理的信', '読めなくても処理が必要な封筒'),
      category: 'institution',
      text: [
        text('区役所寄来的信上写着住民税和缴付期限。数字能看懂，整封信的意思却不够确定。', '区役所から届いた封筒には、住民税と納付期限が書かれている。数字は読めても、文面全体には確信が持てない。'),
        text('制度不会因为你还没适应这里，就晚一点运行。', '制度は、あなたがまだここに慣れていないからといって、少し待ってはくれない。'),
      ],
      weight: 0.7,
      conditions: [{ type: 'elapsedMonth', operator: 'gte', value: 7 }],
      options: [
        {
          id: 'confirm-and-pay',
          tone: 'realistic',
          label: text('查官方说明，不确定的部分向区役所确认', '公式案内を読み、不明点は区役所へ確認する'),
          effects: { cashJpy: -18_000, japanese: 2, workplace: 1, stress: -2, freedom: 1 },
          addFlags: ['tax_notice_handled'],
          response: [text('手续用了一个午休。走出窗口时，你终于知道钱为什么要交。', '手続きには昼休みを一つ使った。窓口を出るころには、何のための支払いかが分かっていた。')],
        },
        {
          id: 'ask-colleague',
          label: text('把个人信息遮住，请可信的同事帮忙确认', '個人情報を隠し、信頼できる同僚に確認を頼む'),
          effects: { cashJpy: -18_000, socialBattery: -2, japanese: 1, workTrust: 1 },
          addFlags: ['tax_notice_handled'],
          response: [text('对方只解释了两分钟。你为了开口，犹豫了两天。', '説明は二分で終わった。声をかけるまでには二日かかった。')],
        },
        {
          id: 'ignore-letter',
          label: text('先压在桌角，等以后看懂再说', '机の端に置き、もっと分かるようになってから考える'),
          effects: { stress: 6, debtStress: 3, lossOfControl: 2 },
          addFlags: ['tax_notice_unhandled'],
          response: [text('信没有变厚。它在房间里占据的地方却越来越大。', '封筒の厚さは変わらない。それでも、部屋の中で占める場所だけが大きくなっていく。')],
        },
      ],
    },
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-institution-medical-paperwork',
      title: text('病名之外的手续', '病名の外側にある手続き'),
      category: 'institution',
      text: [
        text('复查后，你拿到一叠关于医疗补助和后续申请的说明。', '再検査のあと、医療費助成と今後の申請についての案内を受け取った。'),
        text('身体的事已经够难，制度又要求你按格子证明它。', '身体のことだけでも難しいのに、制度はそれを枠の中で証明するよう求めてくる。'),
      ],
      weight: 0.65,
      conditions: [
        { type: 'flag', flag: 'health_follow_up_booked' },
        { type: 'elapsedMonth', operator: 'gte', value: 6 },
      ],
      options: [
        {
          id: 'make-checklist',
          tone: 'realistic',
          label: text('列出材料、窗口和期限，一项项处理', '必要書類、窓口、期限を一覧にして一つずつ進める'),
          effects: { japanese: 2, mental: 1, stress: -2, freedom: 2, boundary: 1 },
          addFlags: ['medical_paperwork_started'],
          response: [text('你没有变得擅长生病。只是暂时学会了怎样不被手续淹没。', '病気が得意になったわけではない。ただ、手続きに溺れない方法を少し覚えた。')],
        },
        {
          id: 'postpone-paperwork',
          label: text('先把资料收好，等精神好一点再办', '資料をまとめ、少し余裕が戻ってから進める'),
          effects: { mental: 1, stress: 2, recoveryDebt: 2 },
          addFlags: ['medical_paperwork_pending'],
          response: [text('延期本身不是放弃。只是期限仍在日历上。', '延期は諦めではない。ただし、期限はカレンダーに残っている。')],
        },
      ],
    },
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-family-video-call',
      title: text('家里的视频电话', '実家からのビデオ通話'),
      category: 'family',
      text: [
        text('镜头那边问：“最近工作还顺利吧？身体呢？”', '画面の向こうから聞かれる。「仕事は順調？　身体は？」'),
        text('你看见自己住处的一角，忽然不知道应该让他们看到多少。', '自分の部屋の一角が映り込み、どこまで見せていいのか分からなくなった。'),
      ],
      weight: 0.9,
      options: [
        {
          id: 'honest-short-answer',
          tone: 'realistic',
          label: text('说真实情况，但只说现在能说明的部分', '本当の状況を、今話せる範囲で伝える'),
          effects: { mental: 4, socialBattery: -2, lossOfControl: -1, debtStress: -2 },
          addFlags: ['family_told_partial_truth'],
          response: [text('他们没有替你解决问题。电话挂断后，你却不再需要独自假装一切正常。', '家族が問題を解決したわけではない。それでも通話のあと、一人で平気なふりを続けなくてよくなった。')],
        },
        {
          id: 'say-all-fine',
          label: text('笑着说都挺好的', '笑って「全部大丈夫」と答える'),
          effects: { socialBattery: -1, mental: -2, stress: 2, lossOfControl: 1 },
          response: [text('这句话说得很熟练。熟练到你差点也相信了。', 'その言葉は上手に言えた。自分まで信じそうになるくらいに。')],
        },
      ],
    },
    weightRules: [{ conditions: [{ type: 'stat', stat: 'mental', operator: 'lt', value: 45 }], multiplier: 1.8 }],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-family-parcel',
      title: text('从很远的地方寄来的包裹', '遠くから届いた荷物'),
      category: 'family',
      text: [
        text('包裹里没有贵重东西。几包吃的，一双厚袜子，还有一张写得很短的纸。', '高価なものは入っていない。食べ物が少し、厚手の靴下、それから短い手紙。'),
        text('“别总省，该吃就吃。”', '「節約ばかりしないで、ちゃんと食べなさい」'),
      ],
      weight: 0.8,
      conditions: [{ type: 'elapsedMonth', operator: 'gte', value: 5 }],
      options: [
        {
          id: 'call-back',
          tone: 'realistic',
          label: text('收拾好东西，回一个电话', '荷物を片付け、電話を一本かける'),
          effects: { mental: 4, health: 1, socialBattery: -1, lifePoverty: -2 },
          response: [text('电话里还是那些家常话。你听完了，没有急着挂。', '電話では、いつもの話ばかりだった。最後まで聞いて、急いで切らなかった。')],
        },
        {
          id: 'message-thanks',
          label: text('发一句“收到了，谢谢”', '「届いた、ありがとう」と短く送る'),
          effects: { mental: 2, health: 1 },
          response: [text('几秒后，对面回了一个很普通的笑脸。', '数秒後、向こうからごく普通の笑顔の絵文字が返ってきた。')],
        },
      ],
    },
    weightRules: [{ conditions: [{ type: 'stat', stat: 'lifePoverty', operator: 'gte', value: 35 }], multiplier: 1.6 }],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-sidejob-freelance-revision',
      title: text('第一次追加修正', '初めての追加修正'),
      category: 'sidejob',
      text: [
        text('私活客户发来消息：“整体很好，再顺便改两个小地方。”', '副業の依頼主から連絡が来た。「全体はとても良いです。ついでに二点だけ直せますか」'),
        text('附件里列了七项。', '添付には七項目あった。'),
      ],
      weight: 1,
      conditions: [{ type: 'sideHustle', routeId: 'freelance', field: 'completedActions', operator: 'gte', value: 2 }],
      options: [
        {
          id: 'separate-scope',
          tone: 'realistic',
          label: text('区分原范围和追加范围，确认费用与期限', '当初範囲と追加範囲を分け、費用と期限を確認する'),
          effects: { product: 2, boundary: 3, stress: -1, workTrust: 2 },
          addFlags: ['freelance_scope_managed'],
          response: [text('客户没有生气，只是删掉了其中三项，又为剩下的四项确认了价格。', '依頼主は怒らなかった。三項目を取り下げ、残り四項目の金額を確認した。')],
        },
        {
          id: 'revise-all',
          label: text('全部改完，先换来一句好评', '全部直し、まずは高評価を取りにいく'),
          effects: { workTrust: 3, stress: 5, recoveryDebt: 3, boundary: -2 },
          response: [text('好评来了。下一次的“顺便”，也来得更自然了。', '高評価は届いた。次の「ついで」も、より自然に届くようになった。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'sideHustle', routeId: 'freelance', field: 'level', operator: 'gte', value: 2 }], multiplier: 1.8 },
      { conditions: [{ type: 'stat', stat: 'boundary', operator: 'lt', value: 30 }], multiplier: 1.4 },
    ],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-sidejob-material-used',
      title: text('有人真的用了那份资料', 'その資料を、本当に使った人'),
      category: 'sidejob',
      text: [
        text('你收到一封很短的消息。', '短いメッセージが届いた。'),
        text('“按照你的检查表，我第一次在评审前发现了遗漏。”', '「あなたのチェックリストで、初めてレビュー前に漏れを見つけられました」'),
        text('它没有改变收入，却让那几晚的整理第一次有了具体的人。', '収入が変わったわけではない。それでも、あの夜の整理に初めて具体的な誰かが生まれた。'),
      ],
      weight: 1,
      conditions: [{ type: 'sideHustle', routeId: 'it_materials', field: 'completedActions', operator: 'gte', value: 2 }],
      options: [
        {
          id: 'ask-use-case',
          tone: 'realistic',
          label: text('询问实际使用场景，并记下需要改进的地方', '実際の利用場面を聞き、改善点を記録する'),
          effects: { product: 3, tech: 1, mental: 2, obsession: 1 },
          addFlags: ['materials_feedback_collected'],
          response: [text('对方提到一个你从未想过的用法。资料从此不再只是你自己的整理。', '自分では考えなかった使い方を教えてもらった。資料はもう、自分だけの整理ではなくなった。')],
        },
        {
          id: 'quiet-thanks',
          label: text('认真道谢，把消息收进收藏', '丁寧に礼を言い、メッセージを保存する'),
          effects: { mental: 4, stress: -2 },
          response: [text('你没有立刻打开文档继续修改。今晚先允许这句话留下来。', 'すぐに資料を開いて直し始めることはしなかった。今夜は、その言葉を残しておく。')],
        },
      ],
    },
    weightRules: [{ conditions: [{ type: 'sideHustle', routeId: 'it_materials', field: 'level', operator: 'gte', value: 2 }], multiplier: 1.7 }],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-sidejob-content-question',
      title: text('评论区里真正的问题', 'コメント欄の、本当の質問'),
      category: 'sidejob',
      text: [
        text('一条内容下面，有人没有夸你，也没有争论。', '投稿の下に、褒めるでも争うでもないコメントがついた。'),
        text('他问：“我也在日本做项目，但总听不懂会议最后到底决定了什么。该怎么办？”', '「私も日本でプロジェクトに入っています。でも会議の最後に何が決まったのか、いつも分かりません。どうしたらいいですか」'),
      ],
      weight: 1,
      conditions: [{ type: 'sideHustle', routeId: 'content_account', field: 'completedActions', operator: 'gte', value: 3 }],
      options: [
        {
          id: 'answer-concretely',
          tone: 'realistic',
          label: text('用自己的失败经验，给出一个可执行的确认句式', '自分の失敗経験から、実行できる確認フレーズを一つ返す'),
          effects: { japanese: 2, product: 2, workTrust: 1, socialBattery: -1 },
          addFlags: ['content_real_question_answered'],
          response: [text('你写得不长。第二天，对方回来告诉你，他真的在会议上用了。', '長くは書かなかった。翌日、その人は会議で本当に使ったと知らせてくれた。')],
        },
        {
          id: 'save-for-later',
          label: text('先收藏问题，等有余力再认真回答', '質問を保存し、余裕がある時にきちんと答える'),
          effects: { product: 1, stress: -1, socialBattery: 1 },
          response: [text('不是每个问题都必须在今晚回答。记住它，也是一种回应。', 'すべての質問に今夜答える必要はない。覚えておくことも、一つの応答だ。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'sideHustle', routeId: 'content_account', field: 'level', operator: 'gte', value: 2 }], multiplier: 1.8 },
      { conditions: [{ type: 'stat', stat: 'socialBattery', operator: 'lt', value: 30 }], multiplier: 0.6 },
    ],
  },
  {
    kind: 'minigame',
    event: {
      id: 'monthly-sidejob-first-product-user',
      title: text('第一个产品用户', '最初のプロダクト利用者'),
      category: 'sidejob',
      text: [
        text('后台出现了一条不是你自己留下的使用记录。', '管理画面に、自分ではない利用記録が一件現れた。'),
        text('几分钟后，对方报告了一个你测试时没有遇到的问题。', '数分後、テストでは遭遇しなかった不具合が報告された。'),
      ],
      weight: 1,
      conditions: [{ type: 'sideHustle', routeId: 'own_product', field: 'completedActions', operator: 'gte', value: 2 }],
      miniGame: { type: 'incident_response', configId: 'incident-response-v1' },
      options: [
        {
          id: 'reproduce-and-reply',
          tone: 'realistic',
          label: text('先回复已经收到，再复现并建立处理记录', '受領連絡を返し、再現確認と対応記録を始める'),
          effects: { product: 1, tech: 1, workTrust: 1, stress: 1 },
          addFlags: ['product_first_user_supported'],
          response: [text('客户知道消息已经有人接住。你打开日志，第一次以维护者的身份进入问题。', '利用者には、連絡が受け止められたことが伝わった。ログを開き、初めて運用担当として問題に入る。')],
        },
        {
          id: 'fix-silently',
          label: text('先打开代码，找到原因后再回复', '先にコードを開き、原因が分かってから返事をする'),
          effects: { tech: 1, stress: 3, obsession: 1, workTrust: -1 },
          response: [text('代码已经打开。等待回复的人，却不知道你是否看见了消息。', 'コードは開いた。返事を待つ人には、連絡を見たかどうかも分からない。')],
        },
      ],
    },
    weightRules: [{ conditions: [{ type: 'sideHustle', routeId: 'own_product', field: 'level', operator: 'gte', value: 2 }], multiplier: 2 }],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-work-mentor-assignment',
      title: text('“新人就麻烦你带一下了”', '「新人のこと、お願いしてもいい？」'),
      category: 'work',
      text: [
        text('上司把下个月的体制图放到你面前。你的名字旁边，多了一条连向新人的线。', '上司が来月の体制図を見せた。自分の名前から、新人へ一本の線が伸びている。'),
        text('他说会有一点津贴。没有说的是，问题也会先来找你。', '少し手当がつくという。質問が最初に自分へ来ることまでは、言わなかった。'),
      ],
      weight: 0.8,
      conditions: [
        { type: 'elapsedMonth', operator: 'gte', value: 6 },
        { type: 'stat', stat: 'workTrust', operator: 'gte', value: 8 },
        { type: 'flag', flag: 'mentoring_junior_active', present: false },
      ],
      options: [
        {
          id: 'accept-with-scope',
          tone: 'realistic',
          label: text('接受，但先确认带教范围和自己的原任务', '引き受ける前に、指導範囲と自分の既存タスクを確認する'),
          effects: { workTrust: 3, workplace: 2, stress: 3, boundary: 1 },
          addFlags: ['mentoring_junior_active'],
          response: [text('工资会多一点。日历上，也多出了几块不再完全属于自己的时间。', '給料は少し増える。予定表には、自分だけのものではない時間も増えた。')],
        },
        {
          id: 'ask-to-reconsider',
          tone: 'realistic',
          label: text('说明当前负荷，请上司重新安排', '現在の負荷を説明し、体制を再検討してもらう'),
          effects: { boundary: 3, stress: -1, workTrust: -1 },
          response: [text('上司没有立刻答应，也没有再说“顺便”。至少这次，工作量被放到了桌面上。', '上司はすぐには答えなかった。それでも今回は、仕事量が机の上に置かれた。')],
        },
      ],
    },
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-life-stress-smoking',
      title: text('下午的第二包', '午後の二箱目'),
      category: 'life',
      text: [
        text('今天会议很多。下午，你又走进了楼下的便利店。', '今日は会議が多かった。午後、また階下のコンビニへ入った。'),
        text('烟盒拿在手里时，脑子确实安静了一小会儿。', '箱を手にした時、頭の中は確かに少し静かになった。'),
      ],
      weight: 0.6,
      conditions: [
        { type: 'elapsedMonth', operator: 'gte', value: 3 },
        { type: 'stat', stat: 'stress', operator: 'gte', value: 65 },
      ],
      options: [
        {
          id: 'buy-one-more',
          tone: 'realistic',
          label: text('买下，先把下午撑过去', '買って、まず午後をやり過ごす'),
          effects: { mental: 2, stress: -2, health: -1, recoveryDebt: 1 },
          monthlyCost: { category: 'smoking', amountJpy: 700 },
          addFlags: ['stress_smoking_happened'],
          response: [text('眼前的问题没有消失。只是烟燃着的时候，它们暂时排成了一列。', '問題は消えなかった。ただ、煙がある間だけ、少し順番に並んだ。')],
        },
        {
          id: 'walk-past-store',
          tone: 'realistic',
          label: text('绕过便利店，去外面走五分钟', 'コンビニを通り過ぎ、外を五分だけ歩く'),
          effects: { stress: -1, boundary: 1 },
          response: [text('没有变得轻松。至少回去时，手里没有多一只烟盒。', '楽にはならなかった。少なくとも、戻る手に箱は増えていなかった。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 80 }], multiplier: 2 },
      { conditions: [{ type: 'stat', stat: 'mental', operator: 'lte', value: 35 }], multiplier: 1.7 },
      { conditions: [{ type: 'smokingLevel', value: 'heavy' }], multiplier: 1.5 },
    ],
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-life-chain-smoking-day',
      title: text('没有数完的一天', '数えるのをやめた日'),
      category: 'health',
      text: [
        text('今天大概抽了两包。不是因为特别想抽。', '今日はたぶん二箱吸った。特別に吸いたかったわけではない。'),
        text('只是每次停下来的时候，手里总想有点什么。', 'ただ、立ち止まるたびに、手に何かが欲しかった。'),
      ],
      weight: 0.35,
      conditions: [
        { type: 'completedEvent', eventId: 'monthly-life-stress-smoking' },
        { type: 'stat', stat: 'stress', operator: 'gte', value: 75 },
      ],
      options: [
        {
          id: 'stop-counting',
          tone: 'realistic',
          label: text('不再数了，把今天过完', '数えるのをやめ、今日を終える'),
          effects: { mental: 1, stress: -2, health: -3, recoveryDebt: 3, lossOfControl: 1 },
          monthlyCost: { category: 'smoking', amountJpy: 1_400 },
          addFlags: ['chain_smoking_day_happened'],
          response: [text('夜里嘴里发苦。你没有批评自己，只把空烟盒扔进了垃圾袋。', '夜、口の中が苦かった。自分を責めず、空き箱をゴミ袋へ入れた。')],
        },
        {
          id: 'put-pack-away',
          tone: 'realistic',
          label: text('把剩下的烟收起来，今晚到此为止', '残りをしまい、今夜はここまでにする'),
          effects: { stress: 1, boundary: 2, health: 1 },
          response: [text('手空下来以后有些难受。那份难受，也只是今晚的一部分。', '手が空くと少し落ち着かなかった。それも、今夜の一部だった。')],
        },
      ],
    },
  },
  {
    kind: 'normal',
    event: {
      id: 'monthly-health-food-warning',
      title: text('胃先提出了意见', '胃が先に意見を出した'),
      category: 'health',
      text: [
        text('早上醒来时，胃里有一阵说不清的钝痛。', '朝起きると、胃に説明しにくい鈍い痛みがあった。'),
        text('它不证明泡面一定有罪，只提醒你，最近确实一直这样吃。', '即席麺が必ず悪いと証明するものではない。ただ、最近ずっと同じ食べ方だったことを知らせている。'),
      ],
      weight: 0.55,
      conditions: [
        { type: 'foodLifestyle', value: 'survival' },
        { type: 'foodLifestyleMonths', operator: 'gte', value: 2 },
        { type: 'stat', stat: 'recoveryDebt', operator: 'gte', value: 25 },
      ],
      options: [
        {
          id: 'adjust-food',
          tone: 'realistic',
          label: text('这周先正常吃几顿，观察身体', '今週は何度か普通に食べ、身体の様子を見る'),
          effects: { cashJpy: -3_000, health: 2, mental: 1, lifePoverty: -1 },
          response: [text('疼痛没有立刻消失。晚饭里至少出现了蔬菜和热汤。', '痛みはすぐ消えなかった。それでも夕食には、野菜と温かい汁物があった。')],
        },
        {
          id: 'observe-one-day',
          tone: 'realistic',
          label: text('先观察一天，若持续就去看医生', '一日様子を見て、続くなら受診する'),
          effects: { stress: 1, health: -1 },
          response: [text('你把症状和时间记进手机。不是诊断，只是一条不会被忘掉的记录。', '症状と時刻をスマートフォンに記録した。診断ではない。ただ、忘れないための記録だ。')],
        },
      ],
    },
    weightRules: [
      { conditions: [{ type: 'stat', stat: 'stress', operator: 'gte', value: 70 }], multiplier: 1.8 },
      { conditions: [{ type: 'foodLifestyleMonths', operator: 'gte', value: 4 }], multiplier: 2 },
    ],
  },
]

export const monthlyEventMap = new Map(
  monthlyEventDefinitions.map((definition) => [definition.event.id, definition.event]),
)
