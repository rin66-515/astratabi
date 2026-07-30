export type SignCategory =
  | 'away'
  | 'night'
  | 'morning'
  | 'day'
  | 'rain'
  | 'snow'
  | 'weekend'
  | 'update'
  | 'inactive'
  | 'special'
  | 'opening'
  | 'recruiting'

export type UpdateKind = 'BOOK' | 'WORK' | 'STORY' | 'BACKYARD' | 'MUSIC'
export type SpecialDayKind = 'OPEN_HOUSE' | 'REUNION' | 'YEAR_END' | 'NEW_YEAR'

export type SignMessage = {
  id: string
  lines: readonly string[]
  updateKind?: UpdateKind
  specialDayKind?: SpecialDayKind
}

export const signMessages: Record<SignCategory, readonly SignMessage[]> = {
  away: [
    { id: 'away-01', lines: ['掌柜远游。', '铺门未锁。', '诸位请自便。'] },
    { id: 'away-02', lines: ['掌柜出门访友。', '归期未定。', '酒在炉上，莫忘了关火。'] },
    { id: 'away-03', lines: ['掌柜今日不在。', '书可自取。', '酒钱放在桌上便好。'] },
    { id: 'away-04', lines: ['掌柜上山去了。', '若有人问起。', '便说晚些回来。'] },
    { id: 'away-05', lines: ['掌柜去看海了。', '铺中无事。', '诸位随意坐坐。'] },
    { id: 'away-06', lines: ['掌柜外出寻酒。', '若是空手而归。', '还请诸位不要笑他。'] },
    { id: 'away-07', lines: ['掌柜远行。', '灯替他留着。', '客人不必久等。'] },
  ],
  night: [
    { id: 'night-01', lines: ['夜深了。', '酒已温过一回。', '客人还要再添吗？'] },
    { id: 'night-02', lines: ['已过三更。', '赶路的人少了。', '想家的倒是多了。'] },
    { id: 'night-03', lines: ['今夜无事。', '只有风声。', '与一轮不太圆的月亮。'] },
    { id: 'night-04', lines: ['夜已经很深。', '若还不想睡。', '便坐到灯灭为止。'] },
    { id: 'night-05', lines: ['小铺将歇。', '最后一壶酒。', '留给最后一个未归的人。'] },
    { id: 'night-06', lines: ['今夜月色尚可。', '只是无人对饮。'] },
  ],
  morning: [
    { id: 'morning-01', lines: ['天刚亮。', '炉火还小。', '第一壶茶尚未烧开。'] },
    { id: 'morning-02', lines: ['晨风入门。', '昨夜的酒香。', '还没有散尽。'] },
    { id: 'morning-03', lines: ['小铺刚开门。', '今日第一位客人。', '来得很早。'] },
    { id: 'morning-04', lines: ['太阳已升。', '掌柜还没醒。', '客人不妨先看看书。'] },
    { id: 'morning-05', lines: ['新的一日。', '路还是那条路。', '人却可以重新出发。'] },
  ],
  day: [
    { id: 'day-01', lines: ['今日无雨。', '适合赶路。', '也适合偷懒。'] },
    { id: 'day-02', lines: ['铺中清闲。', '掌柜在后院做些无用之事。'] },
    { id: 'day-03', lines: ['今日酒淡。', '故事也短。', '客人莫怪。'] },
    { id: 'day-04', lines: ['门开着。', '风也进来了。', '唯独没有故人。'] },
    { id: 'day-05', lines: ['掌柜正在做工。', '听见脚步声。', '也未必会抬头。'] },
  ],
  rain: [
    { id: 'rain-01', lines: ['外面有雨。', '伞放门边。', '莫拿错了。'] },
    { id: 'rain-02', lines: ['雨还没有停。', '不急的话。', '便再坐一会儿。'] },
    { id: 'rain-03', lines: ['今日雨大。', '过路人少。', '旧事倒想起不少。'] },
    { id: 'rain-04', lines: ['湿衣可晾。', '心事不必留下。'] },
    { id: 'rain-05', lines: ['雨落屋檐。', '有人听雨。', '有人等人。'] },
  ],
  snow: [
    { id: 'snow-01', lines: ['今日有雪。', '酒钱免了。', '只收故事。'] },
    { id: 'snow-02', lines: ['雪落得很慢。', '客人也可走得慢些。'] },
    { id: 'snow-03', lines: ['门前积雪。', '小心脚下。', '莫把远方忘在这里。'] },
    { id: 'snow-04', lines: ['天寒。', '炉火尚暖。', '进门便坐。'] },
    { id: 'snow-05', lines: ['雪夜无客。', '掌柜独自温了两只酒碗。'] },
  ],
  weekend: [
    { id: 'weekend-01', lines: ['今日不谈营生。', '只谈风月。'] },
    { id: 'weekend-02', lines: ['难得清闲。', '掌柜决定少做些正事。'] },
    { id: 'weekend-03', lines: ['今日无账。', '无工。', '无催促。'] },
    { id: 'weekend-04', lines: ['周末开铺。', '酒照旧。', '规矩少一些。'] },
    { id: 'weekend-05', lines: ['今日适合喝酒。', '也适合什么都不做。'] },
  ],
  update: [
    { id: 'update-book', updateKind: 'BOOK', lines: ['今日新得一卷书。', '已放入藏书楼。'] },
    { id: 'update-work', updateKind: 'WORK', lines: ['百工坊有新作。', '路过的人。', '可以进去看看。'] },
    { id: 'update-story', updateKind: 'STORY', lines: ['今日说书。', '故事刚讲到一半。'] },
    { id: 'update-backyard', updateKind: 'BACKYARD', lines: ['后院传来动静。', '想来又做出了什么东西。'] },
    { id: 'update-music', updateKind: 'MUSIC', lines: ['长亭有人弹琴。', '曲子不熟。', '胜在认真。'] },
  ],
  inactive: [
    { id: 'inactive-01', lines: ['掌柜许久未归。', '炉火倒还没有灭。'] },
    { id: 'inactive-02', lines: ['铺中积了些灰。', '好在酒还能喝。'] },
    { id: 'inactive-03', lines: ['这里安静了很久。', '但门一直开着。'] },
    { id: 'inactive-04', lines: ['故事停在旧页。', '赶路的人。', '已经走了很远。'] },
    { id: 'inactive-05', lines: ['掌柜没有失踪。', '只是走得慢了一些。'] },
  ],
  special: [
    { id: 'special-open-house', specialDayKind: 'OPEN_HOUSE', lines: ['今日不问来处。', '进门皆是客。'] },
    { id: 'special-reunion', specialDayKind: 'REUNION', lines: ['今夜团圆。', '若无人相伴。', '小铺也留一席。'] },
    { id: 'special-year-end', specialDayKind: 'YEAR_END', lines: ['旧岁将尽。', '未走完的路。', '来年再走。'] },
    { id: 'special-new-year', specialDayKind: 'NEW_YEAR', lines: ['新岁初开。', '第一壶酒。', '敬仍在路上的人。'] },
  ],
  opening: [
    { id: 'opening-01', lines: ['云月小铺。', '近日初开。', '酒薄，故事也少。', '还请多担待。'] },
    { id: 'opening-02', lines: ['小铺新开。', '木牌是新的。', '掌柜也是生手。'] },
    { id: 'opening-03', lines: ['今日开门。', '尚无熟客。', '诸位来得正好。'] },
    { id: 'opening-04', lines: ['酒刚温。', '灯刚亮。', '故事，也才开了个头。'] },
    { id: 'opening-05', lines: ['铺子初开。', '若有招待不周。', '还请下次再来。'] },
  ],
  recruiting: [
    { id: 'recruiting-01', lines: ['小铺初开。', '尚缺一人。', '一同看云赏月。'] },
    { id: 'recruiting-02', lines: ['招一位看板娘。', '工钱不多。', '故事管够。'] },
    { id: 'recruiting-03', lines: ['掌柜一人。', '偶有忙乱。', '若愿留下。', '便一起守灯。'] },
    { id: 'recruiting-04', lines: ['此处尚缺一人。', '不必会酿酒。', '愿意一起赶路便好。'] },
    { id: 'recruiting-05', lines: ['招一人。', '一起看云。', '一起赏月。', '一起把小铺慢慢开下去。'] },
  ],
}

export const allSignMessages = Object.values(signMessages).flat()
