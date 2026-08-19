# 《云月浮生》Event-Driven Unlock Slice Review

## 1. Review结论

- 判定：通过，提交前待人工确认。
- 本Slice已将“永久解锁后每月必定可执行”拆分为长期解锁状态与月度行动可用性。
- 第2月不再因月份或数值自动开放内容账号，四条副业只能通过事件选择分别发现、分别解锁。
- 第12月年度报告、第18月Stage Ending、清债与无债月逻辑未修改。
- 跨月疾病/恢复期约束不属于本Slice，未实装。

## 2. 状态模型

### 2.1 长期状态

```text
hidden -> discovered -> unlocked
```

- hidden：玩家尚不知道该可能性，UI不展示。
- discovered：已经意识到该路线，但不能作为常规月度行动执行。
- unlocked：通过真实机会或明确选择掌握该路线，不因单月状态下降而回退。

### 2.2 月度状态

```text
available / unavailable / temporary
```

- 月初根据AP、health、mental、stress、recoveryDebt、Flag、路线状态和少量随机权重计算一次。
- 结果保存于MonthlyPlan，同月刷新、切换语言、修改饮食时不会重新抽取。
- temporary由当月事件授予，不改变其他行动的既有快照。
- rest为保底行动，避免当月完全无法操作。

## 3. 正式事件

新增4个最小验证事件：

1. `monthly-finance-extra-income-thought`
   - 第2月以后、已看过清债速度反馈才进入事件池。
   - debtStress提高动机；mental过低或recoveryDebt过高会显著降低权重。
   - 选择“先这样吧”后冷却2个月仍可再次出现。
2. `monthly-sidejob-first-freelance-offer`
   - 只有已发现freelance路线时才可能发生。
   - 接受有边界的真实机会后才正式解锁接私活。
3. `monthly-sidejob-material-idea`
   - 需要已发现IT资料方向，并由tech/workplace状态支持。
   - 选择实际整理资料后正式解锁。
4. `monthly-sidejob-content-feedback`
   - 由副业可能性、日语状态和真实反馈共同触发。
   - 可以先只留下想法，也可以继续记录并正式解锁内容账号。

自己的产品只保留状态接口；本Slice没有新增产品剧情，因此新存档不会自动开放该路线。

## 4. 第2月反馈

- 工资、固定支出、利息和最低还款仍走原月结顺序。
- 第2月月结显示基于当月净还款速度的预计剩余月数。
- 月结后设置`slow_debt_projection_seen`，只作为后续事件池的因果条件，不直接解锁任何功能。

## 5. UI Review

- hidden副业不显示。
- discovered副业显示为“未成形的想法”，不暴露数值阈值。
- unlocked但本月unavailable时保留成长记录，以叙事原因替代执行按钮。
- 核心行动只显示本月可执行按钮；暂不可执行项收纳为简短原因。
- 浏览器实测第2月菜单发生变化，出现“散步留白／这件事这个月暂时没有展开”。
- 第2月副业区完全隐藏，未出现错误的LOCKED卡片。
- 月结实际显示“预计仍需约22个月完成清债”。
- 浏览器控制台error/warning：0件。

## 6. 存档

- Zustand存档版本：v9 -> v10。
- 旧存档`unlockedAtMonth != null`迁移为`unlocked`，不会重新锁定。
- 原未解锁路线迁移为`hidden`。
- 新增eventOccurrences，用于重复事件冷却。
- 旧版月中存档没有availability快照时，本月按旧规则继续可用；从下一月开始生成正式快照。

## 7. 回归与模拟

### 7.1 自动验证

- Vitest：17 files / 103 tests PASS。
- ESLint：PASS。
- TypeScript + Vite production build：PASS。
- `git diff --check`：PASS。

### 7.2 固定种子500回、24个月中位数

| 路线 | 清债月份中位数 | 累计副业收入中位数 | Mental | Stress | RecoveryDebt |
|---|---:|---:|---:|---:|---:|
| 纯工资 | 24 | 0 JPY | 100 | 1 | 2 |
| 接私活 | 19 | 528,000 JPY | 96 | 9 | 2 |
| IT资料 | 18 | 1,008,000 JPY | 91 | 12 | 4 |
| 内容账号 | 20 | 636,000 JPY | 100 | 62 | 9 |
| 产品路线 | 18 | 971,600 JPY | 92 | 66 | 28 |
| 混合路线 | 19 | 598,200 JPY | 51 | 74 | 49 |
| 高透支 | 20 | 271,800 JPY | 31 | 100 | 100 |

模拟器为比较既有收益曲线，会在场景初始化时直接配置对应路线为unlocked；这不是正式游戏的解锁入口。

## 8. 未调整项与风险

- 四条副业的AP、收入、XP、成长和协同数值没有修改。
- IT资料路线在500回模拟中仍表现为清债较快、健康代价较低的强路线。本Slice按约束只记录，不调整数值。
- 社交、旅行目前没有正式MonthlyAction定义；通用available/temporary接口已经具备，具体行动与文案留给后续内容Slice。
- VR目前只有Ending Flag引用，没有正式功能解锁实现。
- Mentor已经由正式事件触发；工资评审属于明确时间节点，不纳入随机行动可用性。
- Institution事件使用earliestMonth与状态条件进入事件池，不是月份到达即解锁功能。

## 9. 下一建议

下一独立Slice实现Multi-Month Constraint Arc：肠胃疾病复发、感染后恢复期等跨月限制。引擎必须逐月执行工资、支出、利息、还款与里程碑判定，画面层再做叙事压缩，不允许直接跳过第12月或第18月。
