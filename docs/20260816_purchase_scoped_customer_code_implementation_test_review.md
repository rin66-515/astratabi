# 购买单元客户编号自动生成 实装・测试Review

## 1. 管理信息

| 项目 | 内容 |
|---|---|
| 管理番号 | WBS-110／BUG-039 |
| Review | RV-DLV-037～040 |
| 对象 | Portal交付创建、客户编号、ASRAY账号开通联动 |
| 实施日 | 2026-08-16 |
| 生产发布判定 | `未判定` |

## 2. 需求与障害根因

旧画面要求客服输入`C001`等客户编号。重复使用同一编号时，Portal会复用既有客户记录，ASRAY侧则因`external_system + external_customer_code`唯一约束拒绝第二个账号，客户领取画面显示账号发行失败。

本期采用简单版购买单元模型：每次购买由服务端生成新的客户编号和交付编号，新建独立客户记录，并在客户专属包完成后开通独立ASRAY账号。客户显示名可以重复，不以姓名、手机号或微信号识别同一购买者。

## 3. 实装内容

| 区分 | 对应 |
|---|---|
| 管理画面 | 删除客户编号输入框，改为“提交后由服务器自动生成” |
| API | `POST /api/v1/admin/deliveries`不再接收`customerCode` |
| 编号 | `BUY-{YYYYMMDD}-{12位随机码}`与`DL-{YYYYMMDD}-{同一随机码}`；业务日为JST |
| 客户记录 | 每次请求新建`portal_customer`，不按显示名或旧编号复用 |
| 冲突控制 | 事前存在检查、最多16次重试、数据库唯一约束最终保护 |
| 审计 | `DELIVERY_CREATED`同时记录生成后的客户编号和交付编号 |
| 订单统计 | 一条`portal_delivery`视为一笔订单；有效订单统计排除`CANCELLED` |

## 4. Review指摘与对应

| ID | 重要度 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-037 | Major | 客服手工复用客户编号会导致ASRAY外部账号唯一约束冲突 | 客户编号改为服务端安全随机生成，每次购买新建客户记录 | Closed（BUG-039） |
| RV-DLV-038 | Major | 以手机号或姓名自动合并会引入误合并、改号与隐私管理 | 初版不做客户主档合并，明确采用购买单元模型 | Closed |
| RV-DLV-039 | Medium | UTC日期可能与日本运营日跨日不一致 | 编号日期固定使用`Asia/Tokyo` | Closed |
| RV-DLV-040 | Medium | 可预测连番容易暴露订单规模，且并发编号需要锁 | 使用排除易混字符的密码学安全随机码，并保留唯一约束 | Closed |

## 5. 测试结果

| 测试层 | 结果 | 证迹 |
|---|---|---|
| Portal前端构建 | PASS | TypeScript／Vite生产构建成功 |
| Portal后端单体 | PASS | 21件、Failure 0、Error 0 |
| ASRAY后端回归 | PASS | 841件、Failure 0、Error 0 |
| 本地Compose | PASS | Portal backend healthy、frontend起动；既有PostgreSQL卷保留 |
| Portal真实API | PASS | 同一显示名连续建立2笔；客户编号、交付编号、ASRAY账号均不重复；两份客户包`READY`、链接`AVAILABLE` |
| ASRAY数据库照合 | PASS | 两账号均为`DEMO_FULL`，三项权益有效，并加入`EXT-TRAINING` |
| 测试账号清理 | PASS | 临时管理员0件；既有管理员密码与账号未修改 |

## 6. 未实施与残存风险

- 正式支付订单号、退款、对账、客户主档合并未实现。
- 正式VPS、TLS、生产数据迁移、生产UAT与Go／No-Go未实施，状态维持`未判定`。
- 随机码冲突概率极低；若16次均失败，API返回`503 PURCHASE_CODE_GENERATION_FAILED`，客服可稍后重试。
- 本地生成的两笔测试订单与ASRAY账号作为结合测试证迹保留，不属于正式客户数据。

## 7. Review结论

已确认代码、自动测试、本地Docker真实API和ASRAY数据库结果一致。简单版“一次购买一条订单、一个客户编号、一个独立ASRAY账号”的受入条件满足；生产发布仍需另行执行正式环境UAT与发布判定。
