# AstraTabi Portal：交付后台基本设计书

- 版本：0.1
- 日期：2026-07-26
- 状态：后端实现前的基准设计
- 适用范围：AstraTabi 的资料包人工确认收款、客户专属链接交付与单管理员运营

## 1. 目标与边界

### 1.1 目标

在不要求客户注册账户的前提下，实现可追溯的资料交付：管理员确认收款后，为客户生成带水印的 ZIP 资料包与不可猜测的专属链接；客户通过该链接在有效期和次数限制内下载。

### 1.2 本期确定事项

- 当前仅管理一个固定案件：`ASRAY 勤怠・承認管理システム`。
- 后台仅一个管理员账户。
- 客服使用中文，通过微信人工沟通和发送链接。
- 客户不登录；客户身份由专属链接令牌识别。
- 资料原件不直接公开；每次交付使用客户专属副本。

### 1.3 本期不实现

- 自动支付、微信支付回调、发票与退款。
- 多管理员、客户自助账户、客户资料编辑。
- 公开的后台地址或通过前端隐藏实现的权限控制。

## 2. 业务流程

```text
小红书 / 抖音内容 → 公开资料页 → 微信人工沟通与付款
→ 管理员确认收款 → 上传或选择原始资料包
→ 服务端生成交付编号、水印副本与专属令牌
→ 管理员复制链接，通过微信发送
→ 客户打开链接 → 服务端校验 → 下载并记录日志
```

### 2.1 交付状态

| 状态 | 含义 | 可迁移至 |
|---|---|---|
| `DRAFT` | 已建立交付，未确认收款或资料未齐 | `PREPARING`、`CANCELLED` |
| `PREPARING` | 正在生成水印副本或等待管理员检查 | `ISSUED`、`CANCELLED` |
| `ISSUED` | 专属链接有效，可领取 | `EXPIRED`、`REVOKED` |
| `EXPIRED` | 超过有效期 | `ISSUED`（延期或重发）、`REVOKED` |
| `REVOKED` | 管理员主动停止 | `ISSUED`（重发） |
| `CANCELLED` | 未交付即取消 | 终态 |

任何状态迁移均由后端事务执行，并写入审计日志；前端仅展示结果。

## 3. 权限与认证

### 3.1 管理员

- 路径：`/admin/login` 与 `/admin/*`。
- 仅允许一个启用的 `ADMIN` 用户。
- 管理 API 的每个请求均在服务器端验证会话与管理员权限。
- 密码采用 Argon2id 哈希保存；不得明文、可逆加密或写入前端配置。
- 会话使用 `HttpOnly`、`Secure`、`SameSite` Cookie；生产环境仅 HTTPS。
- 登录失败限流；连续失败达到阈值后临时锁定；登录、登出、失败均记录审计日志。

密码与会话策略参考 [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) 与 [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。

### 3.2 客户专属链接

- 链接形式：`https://{domain}/d/{rawToken}`。
- `rawToken` 使用密码学安全随机数生成，长度至少 256 bit；不得使用订单号、客户编号、时间戳或可预测序列。
- 数据库仅保存 `SHA-256(rawToken)`，不保存或记录原始令牌。
- 客户每次查看、发起下载均由服务器端验证令牌、状态、有效期和次数。
- 链接与管理员会话完全独立，客户无需账号。

访问控制不能仅靠前端路由、隐藏按钮或文件名，必须在服务端每次请求时验证。参考 [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)。

## 4. 数据模型

以下为 PostgreSQL 逻辑表。实际列类型、索引和迁移在详细设计阶段确定。

| 表 | 主要字段 | 用途 |
|---|---|---|
| `portal_admin_user` | `admin_id`、`login_id`、`password_hash`、`enabled`、`last_login_at` | 单管理员账户 |
| `portal_customer` | `customer_id`、`customer_code`、`display_name`、`wechat_contact`、`created_at` | 客户和微信联系信息 |
| `portal_delivery` | `delivery_id`、`delivery_no`、`customer_id`、`project_code`、`status`、`expires_at`、`download_limit`、`download_count`、`watermark_text` | 一次交付的主记录 |
| `portal_delivery_package` | `package_id`、`delivery_id`、`source_object_key`、`delivered_object_key`、`file_name`、`sha256`、`generation_status` | 原始资料与客户水印副本 |
| `portal_delivery_token` | `token_id`、`delivery_id`、`token_hash`、`issued_at`、`revoked_at`、`last_used_at` | 专属链接令牌，支持重发与撤销 |
| `portal_download_event` | `event_id`、`delivery_id`、`token_id`、`package_id`、`event_type`、`occurred_at`、`client_ip`、`user_agent` | 查看、下载请求、下载成功/失败日志 |
| `portal_audit_log` | `audit_id`、`actor_type`、`actor_id`、`action`、`target_type`、`target_id`、`before_json`、`after_json`、`occurred_at` | 管理操作审计 |

### 4.1 关键约束

- `delivery_no` 唯一，例如：`DL-20260726-C001-0001`。
- `customer_code` 唯一，例如：`C001`。
- 同一 `token_hash` 唯一；撤销后不得再次启用同一令牌。
- `download_count <= download_limit` 由数据库事务和行锁保证。
- `watermark_text` 在发放时固定，例如：`ASRAY / C001 / DL-20260726-C001-0001`；之后不因客户资料修改而变化。
- 原始对象与交付对象均使用私有存储路径；数据库仅保存对象键，不保存公网文件 URL。

## 5. API 基本契约

### 5.1 管理端 API

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | 管理员登录并建立会话 |
| `POST` | `/api/v1/admin/auth/logout` | 注销会话 |
| `GET` | `/api/v1/admin/session` | 取得当前管理员信息 |
| `GET` | `/api/v1/admin/deliveries` | 分页、搜索、状态筛选交付记录 |
| `POST` | `/api/v1/admin/deliveries` | 建立 `DRAFT` 交付记录 |
| `POST` | `/api/v1/admin/deliveries/{id}/packages` | 上传原始 ZIP 或关联已存在资料包 |
| `POST` | `/api/v1/admin/deliveries/{id}/issue` | 生成水印副本、令牌与可复制专属链接 |
| `POST` | `/api/v1/admin/deliveries/{id}/extend` | 延长有效期 |
| `POST` | `/api/v1/admin/deliveries/{id}/reissue` | 撤销旧令牌并发放新链接 |
| `POST` | `/api/v1/admin/deliveries/{id}/revoke` | 停止链接 |
| `GET` | `/api/v1/admin/deliveries/{id}/events` | 查询下载和管理审计记录 |

### 5.2 客户端 API

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/v1/deliveries/{rawToken}` | 显示可领取的资料摘要；不消耗下载次数 |
| `POST` | `/api/v1/deliveries/{rawToken}/download-tickets` | 原子校验次数并签发一次性下载票据 |
| `GET` | `/api/v1/download-tickets/{ticket}` | 下载交付文件；票据短时有效且只能使用一次 |

前端请求下载时只传递 `rawToken`，不得传递、信任或修改 `download_count`、`download_limit`、交付状态或文件对象键。后端以数据库中当前记录为唯一权威数据源，在事务内完成校验、次数扣减、日志写入和票据签发，并在响应中返回最新剩余次数供前端显示。

API 失败不得暴露客户名称、存储路径、令牌哈希或内部异常信息。管理员写操作使用 CSRF 防护并要求有效会话。

## 6. 水印与文件交付

### 6.1 生成规则

1. 管理员确认收款后创建或选择 `DRAFT` 交付。
2. 服务端分配 `delivery_no`。
3. 服务端生成并持久化 `watermark_text`。
4. 服务端从原始资料生成客户专属副本，在 Excel 工作表的可见页眉/页脚或约定位置写入水印信息。
5. 将生成后的文件打包为 ZIP，计算 SHA-256，存入私有存储。
6. 管理员检查成功后将交付状态更新为 `ISSUED`，并仅在此时返回原始专属链接一次。

### 6.2 下载次数处理

`POST /download-tickets` 使用数据库事务锁定交付记录：

1. 校验令牌未撤销、状态为 `ISSUED`、未过期且剩余次数大于 0。
2. 原子增加 `download_count`，写入 `DOWNLOAD_TICKET_ISSUED` 日志。
3. 生成短时、一次性下载票据。
4. 票据被使用后写入 `DOWNLOAD_COMPLETED`；失败则记录失败原因。

已确认规则：“发起下载”即消耗一次下载次数。网络下载中断或客户重复点击不返还次数；该规则必须在客服说明和交付页面中明确展示。后续不采用“下载完成后计次”，以避免引入复杂且不可靠的完成确认机制。

### 6.3 存储原则

- 开发环境可使用 VPS 上不被 Web 根目录暴露的私有目录。
- 生产环境优先使用私有对象存储；Web 服务器不直接列目录或暴露对象键。
- 后端验证通过后，可以代理文件流或生成极短有效期的一次性签名 URL。
- 水印和 Excel 只读属性用于提高外传成本，不能视为 DRM；真正的访问控制来自令牌、有效期、次数和服务端校验。

## 7. 管理端页面与 API 对应

| 页面能力 | 依赖 API | 后端结果 |
|---|---|---|
| 交付总数、发放中、即将到期、已停用 | `GET /admin/deliveries?summary=true` | 统计值 |
| 搜索、状态筛选、分页 | `GET /admin/deliveries` | 服务器分页列表 |
| 新建交付 | `POST /admin/deliveries` | `DRAFT` 记录 |
| 上传资料 | `POST /admin/deliveries/{id}/packages` | 私有原始对象 |
| 生成专属链接 | `POST /admin/deliveries/{id}/issue` | 水印 ZIP、令牌、链接 |
| 详情抽屉 | `GET /admin/deliveries/{id}` | 交付、资料、令牌摘要 |
| 延期、重发、停用 | 各状态变更 API | 新状态与审计日志 |

## 8. 实现顺序

1. Spring Boot 管理员认证、会话和 PostgreSQL 迁移。
2. 客户/交付/令牌/审计表与管理列表 API。
3. 私有文件上传、原始 ZIP 管理和交付状态流转。
4. Excel 水印副本与 ZIP 生成任务。
5. 客户专属链接、下载票据、次数限制与下载日志。
6. 管理台连接真实 API，并移除静态 Mock 数据。
7. HTTPS、反向代理、备份、日志轮转与上线检查。

## 9. 待决事项

- 生产对象存储供应商及地区。
- 正式域名和 HTTPS 证书配置。
- 微信支付是否接入自动回调，或继续人工确认收款。
- 客服微信号、二维码和对外售后/下载次数规则。
- 资料包最终内容、价格和真实对外文案。
