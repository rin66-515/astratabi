# AstraTabi Portal：交付后台基本设计书

- 版本：0.8
- 日期：2026-08-16
- 状态：客户密码、加密资料包、真实下载与ASRAY账号联动已完成本地验证；生产发布未判定
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
→ 管理员上传 ZIP 与 SHA-256，登记不可变母版版本
→ 管理员确认收款 → 输入客户显示名并选择母版版本
→ 服务端按本次购买自动生成客户编号与交付编号、建立交付并生成专属令牌
→ 服务端生成客户水印副本
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

当前实现中，管理员创建交付后可生成专属链接，状态进入`PREPARING`。客户设置资料密码并成功生成加密ZIP后，系统将`package_ready=true`、状态切换为`ISSUED`。此后允许签发下载票据，并在首次取得真实文件流时扣减下载次数。

本期采用购买单元管理：每次购买均新建一条`portal_customer`和一条`portal_delivery`，并开通一个独立ASRAY账号。客户显示名允许重复，系统不以姓名、手机号或微信号判断是否为同一人；订单统计以`portal_delivery`为基本单位，取消订单可按`status <> 'CANCELLED'`从有效订单数中排除。

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

- 当前前端链接形式：`https://{domain}/#delivery?token={rawToken}`；正式路由可在部署阶段改为 `/d/{rawToken}`，令牌规则不变。
- `rawToken` 使用密码学安全随机数生成，长度至少 256 bit；不得使用订单号、客户编号、时间戳或可预测序列。
- 数据库保存用于访问照合的`SHA-256(rawToken)`。新发放令牌同时以独立密钥进行AES-256-GCM加密，仅供已认证管理员从详情画面再次取得当前有效链接；不得保存明文或写入日志。
- 既有令牌没有密文时继续保持有效，管理员详情提示重新发放，不得因迁移自动撤销。
- 客户每次查看、发起下载均由服务器端验证令牌、状态、有效期和次数。
- 链接与管理员会话完全独立，客户无需账号。

访问控制不能仅靠前端路由、隐藏按钮或文件名，必须在服务端每次请求时验证。参考 [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)。

## 4. 数据模型

以下为 PostgreSQL 逻辑表。实际列类型、索引和迁移在详细设计阶段确定。

| 表 | 主要字段 | 用途 |
|---|---|---|
| `portal_admin_user` | `admin_id`、`login_id`、`password_hash`、`enabled`、`last_login_at` | 单管理员账户 |
| `portal_customer` | `customer_id`、`customer_code`、`display_name`、`wechat_contact`、`created_at` | 购买单元的客户表示；同一购买者再次购买时另建记录 |
| `portal_package_release` | `package_release_id`、`project_code`、`product_id`、`version`、`release_date`、`file_name`、`storage_key`、`sha256`、`status` | 经校验的不可变母版 ZIP 版本 |
| `portal_delivery` | `delivery_id`、`delivery_no`、`customer_id`、`package_release_id`、`project_code`、`status`、`expires_at`、`download_limit`、`download_count`、`watermark_text` | 一次交付的主记录；旧数据允许母版外键为空 |
| `portal_delivery_package` | `package_id`、`delivery_id`、`source_object_key`、`delivered_object_key`、`file_name`、`sha256`、`generation_status` | 原始资料与客户水印副本 |
| `portal_asray_provisioning` | `delivery_id`、`event_id`、`status`、`user_id`、Activation密文、重试/错误 | ASRAY账号开通结果 |
| `portal_delivery_token` | `token_id`、`delivery_id`、`token_hash`、`issued_at`、`revoked_at`、`last_used_at` | 专属链接令牌，支持重发与撤销 |
| `portal_download_event` | `event_id`、`delivery_id`、`token_id`、`package_id`、`event_type`、`occurred_at`、`client_ip`、`user_agent` | 查看、签票与下载开始日志 |
| `portal_audit_log` | `audit_id`、`actor_type`、`actor_id`、`action`、`target_type`、`target_id`、`before_json`、`after_json`、`occurred_at` | 管理操作审计 |

### 4.1 关键约束

- `customer_code`由服务端按购买自动生成，格式为`BUY-{JST业务日YYYYMMDD}-{12位易读随机码}`，全表唯一；不接受前端指定。
- `delivery_no`与本次客户编号共用日期和随机部分，格式为`DL-{JST业务日YYYYMMDD}-{12位易读随机码}`，全表唯一。
- 易读随机码使用密码学安全随机数，并排除`0`、`1`、`I`、`O`等易混淆字符；生成冲突时最多重试16次，数据库唯一约束作为最终保护。
- 同一 `token_hash` 唯一；撤销后不得再次启用同一令牌。
- `download_count <= download_limit` 由数据库事务和行锁保证。
- `watermark_text` 在发放时固定，例如：`ASRAY / BUY-20260816-5KXFF5F4E4YG / DL-20260816-5KXFF5F4E4YG`；之后不因客户资料修改而变化。
- 原始对象与交付对象均使用私有存储路径；数据库仅保存对象键，不保存公网文件 URL。
- 母版 ZIP 文件名格式为 `ASRAY_COMPLETE_v{SemVer}_{YYYYMMDD}.zip`，并必须同时上传同名 `.sha256`。
- 服务端重新计算 SHA-256；同名同哈希视为幂等，同名异哈希或同版本/发布日期异文件一律拒绝覆盖。
- 母版只能从 `ACTIVE` 归档为 `ARCHIVED`，物理文件不删除；归档不影响已有交付，但不能用于新交付。
- ZIP 上传时检查空包、条目数量、解压总量、异常压缩比、重复路径和路径穿越。

## 5. API 基本契约

### 5.1 管理端 API

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | 管理员登录并建立会话 |
| `POST` | `/api/v1/admin/auth/logout` | 注销会话 |
| `GET` | `/api/v1/admin/session` | 取得当前管理员信息 |
| `GET` | `/api/v1/admin/deliveries` | 分页、搜索、状态筛选交付记录；默认按`created_at DESC, delivery_id DESC`稳定倒序；返回已发行ASRAY User ID和账号状态 |
| `GET` | `/api/v1/admin/deliveries/{id}` | 取得交付详情、ASRAY User ID及当前有效链接；响应禁止缓存，旧摘要记录不返回链接 |
| `GET` | `/api/v1/admin/package-releases` | 查询有效/归档母版版本 |
| `POST` | `/api/v1/admin/package-releases` | 同时上传 ZIP 与 `.sha256`，校验后登记不可变版本 |
| `POST` | `/api/v1/admin/package-releases/{id}/archive` | 逻辑归档母版；不删除文件 |
| `POST` | `/api/v1/admin/deliveries` | 接收`customerName`、`packageReleaseId`、`expiresAt`、`downloadLimit`；服务端自动编号并建立`DRAFT`交付记录 |
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
| `POST` | `/api/v1/deliveries/{rawToken}/document-password` | 校验客户设置的资料密码，生成加密客户包并开通ASRAY账号 |
| `GET` | `/api/v1/download-tickets/{ticket}` | 下载交付文件；票据短时有效且只能使用一次 |

前端请求下载时只传递 `rawToken`，不得传递、信任或修改 `download_count`、`download_limit`、交付状态或文件对象键。后端以数据库中当前记录为唯一权威数据源。签票只建立短时凭证；首次取得真实文件流时，后端在事务内完成票据认领、次数扣减与开始事件写入。

管理员交付响应只允许返回ASRAY User ID和账号状态，不得返回资料密码、登录密码、Activation URL密文、内部签名信息或Provisioning错误详情。API失败不得暴露客户名称、存储路径、令牌哈希或内部异常信息。管理员写操作使用 CSRF 防护并要求有效会话。

## 6. 水印与文件交付

### 6.1 生成规则

1. 管理员先上传不可变母版 ZIP 与 `.sha256`，服务端完成文件名、哈希和 ZIP 安全校验。
2. 管理员确认收款后输入客户显示名并选择一个 `ACTIVE` 母版版本创建 `DRAFT` 交付；前端不输入客户编号。
3. 服务端按本次购买分配`customer_code`和`delivery_no`，新建购买单元客户记录，并固定母版外键、文件名和`watermark_text`。
4. 客户通过专属链接设置12～64位资料打开密码；密码只在本次请求内存中使用，不写数据库或日志。
5. 服务端从母版生成客户专属副本，在每个Excel Sheet页脚写入客户编号与交付编号，并执行OOXML Agile加密。
6. 将生成后的副本打包为ZIP，计算SHA-256并原子移动到私有存储；成功后更新为`ISSUED + READY`。
7. 客户页面显示ASRAY账号激活信息，并允许签发一次性下载票据。

### 6.2 下载次数处理

下载处理分为签票与真实取流：

1. 校验令牌未撤销、状态为 `ISSUED`、未过期且剩余次数大于 0。
2. 生成短时、一次性下载票据；此时不增加`download_count`。
3. `GET /download-tickets/{ticket}`再次校验文件、票据与交付状态，在数据库锁内认领票据并增加`download_count`。
4. 开始返回ZIP文件流并写入`DOWNLOAD_STARTED`。

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
| 搜索、状态筛选、分页 | `GET /admin/deliveries` | 服务器分页列表；最新生成记录优先，相同生成时刻按交付ID倒序；显示ASRAY账号或“未发行” |
| 新建交付 | `POST /admin/deliveries` | `DRAFT` 记录 |
| 上传母版 | `POST /admin/package-releases` | 私有不可变 ZIP、SHA-256 与版本记录 |
| 归档母版 | `POST /admin/package-releases/{id}/archive` | 保留文件并禁止新交付选择 |
| 生成专属链接 | `POST /admin/deliveries/{id}/issue` | 水印 ZIP、令牌、链接 |
| 详情抽屉 | `GET /admin/deliveries/{id}` | 交付、资料、ASRAY账号与复制操作、当前有效链接或旧数据不可恢复状态 |
| 延期、重发、停用 | 各状态变更 API | 新状态与审计日志 |

## 8. 实现顺序

1. Spring Boot 管理员认证、会话和 PostgreSQL 迁移。
2. 客户/交付/令牌/审计表与管理列表 API。
3. 管理台与客户受取页面连接真实 API。
4. 私有文件上传、不可变母版 ZIP 管理和交付版本固定。（已完成）
5. Excel 水印/加密副本与 ZIP 生成。（已完成，本地）
6. 一次性下载票据、次数限制与实际文件流交付。（已完成，本地）
7. ASRAY账号开通、一次性激活与单会话验证。（已完成，本地）
8. 单体测试、结合测试、综合测试与上线检查。
9. HTTPS、反向代理、备份、日志轮转与正式发布。

## 10. 实现记录（更新：2026-08-01）

### 10.1 已完成

- 独立 Java 21 / Spring Boot 后端位于 `backend/`；不复用或影响 ASRAY 项目。
- PostgreSQL 本机开发 Compose、Flyway V1～V4 迁移、交付/客户/令牌/下载票据/下载事件/审计表已建立。
- 单管理员登录、Argon2id 密码哈希、失败锁定、服务器会话、CSRF Cookie、管理员操作审计已接通。
- 管理端已接通交付创建、列表/分页/筛选、汇总、链接发放/重发、延期、停止和事件查询 API。
- 客户端已接通令牌摘要查询；资料尚未完成时返回 `PREPARING`，下载票据请求返回 `409 DELIVERY_NOT_READY`，不会扣减次数。
- React 管理台已经替换为真实 API 数据源；Vite 本机代理使用 `/api`，避免开发时跨域会话问题。
- Flyway V5/V6 已建立 `portal_package_release` 及交付外键，并通过 PostgreSQL 18.4 与 Hibernate Schema Validate。
- 后端已实现私有目录存储、双文件上传、SHA-256 重算、ZIP 安全检查、不可覆盖、幂等重传和逻辑归档。
- 管理台已实现母版上传、版本/哈希列表、归档操作，以及新建交付时只能选择有效母版版本。
- 项目内测试件为 `dev-fixtures/ASRAY_COMPLETE_v0.0.0_20260801.zip`；仅用于开发验证，不是正式交付包。

### 10.2 客户专属交付与账号联动（更新：2026-08-07）

- Flyway V7新增`portal_delivery_package`、`portal_asray_provisioning`及商品ID。
- 客户密码校验、逐Sheet页脚水印、XLSX Agile加密、客户ZIP/SHA-256和失败重试已实现。
- 真实ZIP流、一次性票据与首次取流计次已实现；网络层不伪造客户端保存完成事件。
- ASRAY HMAC幂等开通、Activation URL密文保存、一次性激活与单会话已完成本地跨系统验证。
- 正式域名、TLS、对象存储、正式客户UAT、备份恢复和生产Go/No-Go仍未实施。

### 10.3 购买单元自动编号（更新：2026-08-16）

- 管理台不再要求客服手工输入客户编号；编号与交付编号由服务端按JST业务日和安全随机码生成。
- 同一客户显示名连续购买时，每次建立独立客户记录、交付记录、客户专属包和ASRAY账号；不进行跨订单账号复用。
- 本地真实API以同一显示名连续建立两笔交付，两个客户编号、交付编号和ASRAY账号均不重复；两份专属包达到`READY`，ASRAY侧`DEMO_FULL`三项权益与共用训练案件成员资格均已确认。
- 生产环境支付订单号、退款对账和客户主档合并仍未实施；当前订单量直接以交付表统计。

### 10.4 客服交付一览默认排序（更新：2026-08-16）

- 无筛选、仅状态、仅关键字、状态与关键字组合四种查询均使用同一分页排序规则。
- 第一排序键为交付生成时刻`created_at DESC`，保证客服优先看到最新生成的交付。
- 第二排序键为`delivery_id DESC`，用于生成时刻相同时稳定分页边界，避免同一记录在翻页时重复或遗漏。
- 有效期、发放状态和交付编号中的日期均不得代替生成时刻作为排序依据。

### 10.5 客服ASRAY账号照合（更新：2026-08-16）

- 管理员交付一览及详情直接显示`portal_asray_provisioning.asray_user_id`；未生成时显示“未发行”。
- 一览按当前页交付ID集合一次性取得Provisioning，禁止按行查询。
- 详情提供只读账号与复制按钮，复制失败时选中账号并提示手工复制。
- API只返回User ID和账号状态，不返回资料密码、登录密码、Activation URL密文、Provisioning错误详情或内部Secret。
- 本功能只改善客服照合，不改变账号开通、商品权限、密码或下载流程。

### 10.6 客服交付管理台Layout（更新：2026-08-16）

- 桌面管理区域最大宽度统一为1360px；1280px以上采用一览与360～380px详情栏的两栏构成。
- 交付一览取消强制最小表格宽度，采用固定列比例。交付编号与ASRAY账号允许安全换行，客户名称使用省略表示，禁止为查看首列而横向滚动。
- 1280px以下的一览占满可用宽度，点击“详情”后以底部抽屉表示；760px以下继续使用Card一览。
- 详情中的有效链接输入框独占一行，复制与新窗口操作位于下一行；延期与重新发放同行，停止链接独立一行并使用警示色。
- React详情打开判定与CSS响应式切换统一使用1280px，避免中等宽度下侧栏隐藏但抽屉未打开。
- 本Layout补正不改变API、DB、权限、密码、交付状态、下载次数及审计规则。

## 9. 待决事项

- 生产对象存储供应商及地区。
- 正式域名和 HTTPS 证书配置。
- 微信支付是否接入自动回调，或继续人工确认收款。
- 客服微信号、二维码和对外售后/下载次数规则。
- 资料包最终内容、价格和真实对外文案。
