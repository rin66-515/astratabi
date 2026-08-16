# WBS-111 资料・ASRAY共通密码直接开通 实装・测试・Review结果

## 1. 管理信息

| 项目 | 结果 |
|---|---|
| 对象 | 资料密码、ASRAY账号直接开通、既有待激活账号兼容 |
| 实装状态 | `完了` |
| Review | `完了` |
| 本地自动测试 | `合格` |
| 本地跨系统测试 | `合格` |
| 正式UAT／Go・No-Go | `未実施／未判定` |

## 2. 实装结果

- 客户资料密码通过HMAC签名的内部请求传递，ASRAY接收后立即生成BCrypt hash；Portal和ASRAY均不保存密码原文。
- 新购买账号以`ACTIVE`状态创建，不生成Activation URL或Activation token。
- 同一Event对应既有`PENDING_ACTIVATION`账号时，保持User ID不变并原地开通，同时使旧Activation token失效。
- 同一Event已为`ACTIVE`时只返回既有账号，不更新Password hash。
- Portal Flyway V10追加账号状态列；既有完成记录先标记为`PENDING_ACTIVATION`，再次联动后校正为ASRAY实际状态。
- 客户取件页持久显示ASRAY User ID与账号状态；既有待激活记录提供密码补录入口，不再显示独立Activation链接。

## 3. 测试证据

| 区分 | 结果 |
|---|---|
| Portal Backend | 21件成功、Failure 0、Error 0、Skip 0 |
| Portal Frontend | TypeScript及Vite生产Build成功 |
| ASRAY Backend | 844件成功、Failure 0、Error 0、Skip 0 |
| Docker Build | ASRAY Backend、Portal Backend／Frontend成功，Healthcheck正常 |
| 既有账号兼容 | `asr-FYT8SBUZ`保持同一User IDで`ACTIVE`化、旧token使用済、Login HTTP 200；验证后恢复待激活状态供客户自测 |
| 新规购买 | `DL-E2E-92FCF3C02D00`から`asr-SZRWEE8U`を直接`ACTIVE`作成、Activation行なし、Login HTTP 200 |
| 密码保存 | ASRAY数据库为hash、原文不保存；Event摘要不含Password字段 |
| UI确认 | 客户取件页正常显示，Browser Console Error 0件 |

测试夹具哈希计算遗漏pepper导致一次`DELIVERY_NOT_FOUND`を検出した。应用按设计拒绝了无效token；夹具修正后通过，失败夹具记录已精确清理。产品代码缺陷不成立。

既有账号兼容测试使用了本地待验证账号。为避免随机测试密码阻断后续客户操作，证据取得后将该账号恢复为`PENDING_ACTIVATION`，清除测试Password hash，并更新Session version使临时JWT失效。客户仍可从原取件页使用自己保管的资料密码完成正式本地自测。

## 4. Review闭环

| ID | 结果 |
|---|---|
| RV-DLV-041 | Event摘要改为Password除外Canonical JSON；Closed |
| RV-DLV-042 | 既有Event按账号状态分支并锁定；Closed |
| RV-DLV-043 | ACTIVE重试不调用Password hash更新；Closed |
| RV-DLV-044 | User ID／账号状态改为DB持久响应；Closed |
| RV-DLV-045 | 共通密码风险由页面说明、单一Session、异常IP、暂停、水印及期限控制接受；Accepted |

## 5. 判定

本地Release候选判定为`合格`。正式域名、TLS、正式Secret、正式客户数据、正式UAT、备份恢复及生产Go／No-Go不在本次本地制造范围，继续保持`未実施／未判定`。
