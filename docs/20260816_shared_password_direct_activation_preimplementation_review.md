# 资料・ASRAY共通密码直接开通 制造前Review

## 1. 管理信息

| 项目 | 内容 |
|---|---|
| 管理番号 | WBS-111 |
| 对象 | 客户资料密码、ASRAY账号开通、既有待激活账号兼容 |
| 状态 | `設計確定／未実装／未試験` |
| 生产发布 | `未判定` |

## 2. 受入条件

1. 新购买在资料密码设置成功后生成独立ASRAY账号，响应状态为`ACTIVE`，无需Activation画面。
2. 密码原文不保存到Portal／ASRAY数据库，不写入应用日志、审计、异常信息或幂等摘要。
3. 同一Event重试不重复创建账号；已`ACTIVE`时不重设密码。
4. 既有`PENDING_ACTIVATION`账号以同一Event和本次密码转为`ACTIVE`，旧Activation token同时失效。
5. 领取页刷新后继续显示ASRAY User ID；既有待激活账号显示密码补录入口。
6. 商品Entitlement、`MEMBER`角色、`EXT-TRAINING`所属、单一Session及账号暂停控制保持不变。

## 3. 制造前指摘

| ID | 重要度 | 指摘 | 设计对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-041 | Major | 将含密码的Request原文SHA-256保存为幂等摘要会增加离线猜测风险 | HMAC继续覆盖完整Body，持久化幂等摘要改为排除密码的业务字段摘要 | Closed（设计） |
| RV-DLV-042 | Major | 旧Event已有账号，直接再次开户会发生唯一约束冲突 | 同Event按现有账号状态分支，待激活时原地激活，已激活时只返回 | Closed（设计） |
| RV-DLV-043 | Major | 已ACTIVE账号在重试时被新密码覆盖会造成意外锁出 | ACTIVE幂等重试禁止更新Password hash | Closed（设计） |
| RV-DLV-044 | Medium | 画面只用临时State显示账号，刷新后信息消失 | 公开领取查询返回持久化User ID与账号状态 | Closed（设计） |
| RV-DLV-045 | Medium | 共通密码泄露会同时影响资料与模拟系统 | 页面明示共用范围，并维持单Session、异常IP、暂停、水印和期限控制 | Accepted |

正式TLS、实Secret、正式客户UAT及Go／No-Go不属于本地制造范围，继续为`未实施／未判定`。
