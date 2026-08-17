# 《云月浮生》Incident Response / Design Review MiniGame 实装 Review

实施日：2026-08-18

对象分支：`main`

前置 Event & MiniGame Content 存档：`cba2e49`

人工作品 Review：`実施済`

用户验收：`未実施`

## 1. 本轮范围

| 项目 | 状态 |
|---|---|
| `incident_response` 项目炎上 MiniGame | `実装済` |
| `design_review` 设计书找茬 MiniGame | `実装済` |
| 中日双语标题、正文、选项与结果 | `実装済` |
| 三阶段倒计时与阶段 Timeout | `実装済` |
| S / A / B / C / D 评价与 GameState 回写 | `実装済` |
| MiniGame 进行中刷新恢复 | `確認済` |
| 既有正式事件 Trigger 接入 | `実装済` |
| 15个正式事件文案 / 节奏 Review | `実施済` |
| 新事件、新结局、新副业、后端或支付 | `未実施` |

## 2. Framework 调整

MiniGame 的标题、结果标题和 S～D 评价定义已从单一“会社读空气”Resolver 中移入各自配置。

```text
Monthly Event
  ↓
MiniGame Trigger (type + configId)
  ↓
通用三阶段 Session
  ↓
选择或 Timeout
  ↓
通用 Resolver
  ↓
各配置自己的 S～D 结果
  ↓
GameState 回写并返回当月经营
```

- 沿用既有 `activeMiniGame` 存档结构，不新建第二套生命周期。
- `stageIndex / answers / stageStartedAt / deadlineAt / result` 继续由持久化 Store 保存；刷新后不会重新抽题或重置倒计时。
- 既有 `read_the_air` 迁入配置式结果定义，行为和数值保持不变。
- 月度结算、年度报告、Stage Ending、清债、无债月与 Final Ending 的顺序未修改。

## 3. 项目炎上 MiniGame

入口沿用正式事件：`monthly-sidejob-first-product-user`。

| 阶段 | 限时 | 判断重点 |
|---|---:|---|
| 初动确认 | 15秒 | 事实、影响范围、优先级 |
| 控制与沟通 | 12秒 | 止血、对外说明、任务分工 |
| 复旧与收束 | 10秒 | 验证、记录、后续防止 |

- 每阶段都保留至少一个普通现实选项。
- 高评价强调先确认事实、同步影响、止血并留下复盘记录，不把“独自熬夜修完”视为最优。
- 结果根据评价回写 Product、Tech、WorkTrust、Boundary、Stress、RecoveryDebt、Health、Mental、LossOfControl。
- Timeout 为有效选择并进入下一阶段；最后阶段 Timeout 后正常结算，不产生死路。

## 4. 设计书找茬 MiniGame

入口沿用正式事件：`monthly-work-scope-creep`。

| 阶段 | 限时 | 判断重点 |
|---|---:|---|
| 要件追溯 | 14秒 | 需求来源、对象范围、未决事项 |
| 横向整合 | 12秒 | 画面、API、DB、权限一致性 |
| 指摘落地 | 10秒 | 证据、影响、负责人、期限 |

- 每阶段都要求从可验证事实出发，不以吹毛求疵或凭感觉找错作为高分路径。
- 高评价会提高 Tech、Workplace、Product、WorkTrust 与 Boundary；含糊接受或过度承诺会增加 Stress、RecoveryDebt 与 LossOfControl。
- Timeout、刷新恢复、评价与状态回写使用同一个通用 MiniGame Framework。

## 5. 15个正式事件 Review

### 5.1 现实感

- 正式事件数量保持 `15`，没有为接入 MiniGame 新增剧情卡。
- “第一个产品用户”的事件选项只调整为报障受理动作，真正的定位、止血、复旧交给 MiniGame，避免事件文本提前替玩家解决问题。
- “顺便再确认一下”直接接入设计 Review，原有 scope creep 语境和选项 ID 保持不变。

### 5.2 江湖 / 无厘头密度

- 15个正式事件中仅 `1` 个江湖选项。
- 三个 MiniGame 合计仅既有“会社读空气”保留 `1` 个江湖选项；两个新 MiniGame 没有强塞江湖选项。
- 没有新增无厘头或道系固定配额，现实选项始终存在。

### 5.3 观测者语气

- 本轮未扩大观测者出场频度。
- 保留的观测者文本仍为冷静、技术性记录，不替玩家作价值判断，也不提前解释隐藏状态。

### 5.4 连续负面事件密度

- “医疗补助手续”由强制优先的 Major Event 调整为普通 Event，权重由 `1` 降为 `0.65`，降低健康复查之后连续强制负面事件的概率。
- 其触发条件和文本不变，制度压力仍然存在。
- 本轮未引入 cooldown 或情绪导演系统；随机抽选下仍可能自然出现连续负面事件，这是当前事件槽位的剩余风险。

## 6. 自动测试

| 检查 | 命令 | 结果 |
|---|---|---|
| 单体 / Store 流程测试 | `npm.cmd test -- --run` | 14 files / 82 tests `PASS` |
| ESLint | `npm.cmd run lint` | `PASS` |
| TypeScript / Production Build | `npm.cmd run build` | `PASS` |
| 空白与冲突标记检查 | `git diff --check` | `PASS` |

重点自动验证：

- 三个 MiniGame 配置均为中日双语、三阶段、各阶段有倒计时、Timeout 和现实选项。
- `incident_response` 与 `design_review` 均能从既有正式事件进入。
- 两个 MiniGame 均可完成 S 评价、写入完成 Flag，并返回 `monthly-cycle`。
- 通用 Resolver 对三个 MiniGame 使用各自 S～D 结果，不再硬编码“会社读空气”。

## 7. Review 结论与剩余风险

结论：`本 Slice 的代码验收条件已满足，等待用户体验验收后提交存档`。

- 两个 Placeholder 已成为真实可玩的 MiniGame。
- 没有新增正式事件，也没有修改 Ending 或月度生命周期。
- 页面继续复用既有 MiniGame 组件及样式，不新增 CSS，不存在选择器重复或覆盖链。
- 浏览器逐事件人工体验尚未完成；本轮已由 Store 流程测试验证入口、三阶段结算、状态回写和返回路径。最终文案节奏与移动端视觉仍需用户体验验收。
