# 当前实现说明

基准日：2026-08-16

判定依据：当前 `main` 分支的应用代码、Flyway 迁移、Docker Compose 与自动测试。

## 1. 系统构成

| 区分 | 当前构成 | 状态 |
|---|---|---|
| 公开前端 | React + TypeScript + Vite | `実装済` |
| 交付后台 | Java 21 + Spring Boot 4.1 | `実装済` |
| 数据库 | PostgreSQL 18.4 + Flyway V1～V7 | `実装済` |
| 本地入口 | Caddy；`http://127.0.0.1:18100` | `実装済` |
| 本地编排 | Docker Compose：frontend、backend、postgres | `実装済` |
| 正式环境 | HTTPS、域名、外部备份、监控 | `未実装` |

本地 Compose 将全部业务端口限定在 `127.0.0.1`。资料包和数据库分别保存在命名卷中；执行普通 `docker compose down` 不删除数据，`docker compose down -v` 会删除本地数据卷，因此不属于日常操作。

## 2. 公开站

| 机能 | 当前内容 | 状态 |
|---|---|---|
| 门外入口 | 推门进入、离开小铺、世界观文案 | `実装済` |
| 小铺导航 | 酒桌、藏书楼、百工坊、长亭、云月路、后院 | `実装済` |
| 木牌系统 | 独立文案库、配置、同日选择逻辑 | `実装済` |
| 无事牌 | 展示、摆动、点击翻转 | `実装済` |
| 背景音乐 | 网站内播放控制；默认低音量 | `実装済` |
| 后院 | 不开放外部 Git 仓库，保留世界观留白 | `実装済` |
| IT 日语共创 | 当前为展示内容，来访者提交与管理尚未接后台 | `未実装` |
| 内容管理 | 文章、日记、音乐、小说的管理端编辑 | `未実装` |

## 3. 管理员后台

| 机能 | 当前实现 | 状态 |
|---|---|---|
| 登录/退出/会话 | Session 认证、CSRF、Argon2 密码哈希 | `実装済` |
| 登录保护 | 连续失败锁定；默认阈值 5 次、15 分钟 | `実装済` |
| 交付一览 | 分页、关键词、状态筛选、摘要；按生成时刻及交付ID稳定倒序；显示ASRAY账号；桌面固定列比例且无横向滚动 | `実装済` |
| 交付详情 | 基本信息、状态、下载数、ASRAY账号与复制、事件、当前有效链接的安全表示与复制；中等宽度使用底部抽屉 | `実装済` |
| 交付操作 | 新建、生成/重新生成链接、延长、撤销 | `実装済` |
| 购买编号 | 客服输入客户显示名；服务端按每次购买自动生成客户编号与交付编号 | `実装済` |
| 移动端 | 760px以下使用卡片列表与单列操作详情层 | `実装済` |
| 操作审计 | 管理员操作写入 `portal_audit_log` | `実装済` |
| 多管理员角色 | ADMIN/SUPPORT 等权限划分 | `未実装` |
| 二要素认证 | TOTP、WebAuthn 等 | `未実装` |

注意：当前 `/issue` 和 `/reissue` 都会撤销旧令牌、创建新令牌并把交付切换为 `PREPARING`。客户设置资料密码并成功生成加密包后，系统切换为`ISSUED + READY`。尚无独立的重新发放履历表和管理员二次确认的`READY`业务状态。

## 4. 母版资料包

| 机能 | 当前实现 | 状态 |
|---|---|---|
| 上传 | 管理员同时上传 ZIP 和同名 `.sha256` | `実装済` |
| 文件命名 | `ASRAY_COMPLETE_vX.Y.Z_YYYYMMDD.zip` | `実装済` |
| 摘要校验 | 计算 ZIP SHA-256 并与上传文件比对 | `実装済` |
| 不可变版本 | 同名同摘要按幂等重试处理；同名不同内容拒绝 | `実装済` |
| ZIP 安全检查 | 路径、重复条目、条目数、解压总量、异常压缩比 | `実装済` |
| 归档 | ACTIVE 版本可切换为 ARCHIVED | `実装済` |
| 商品识别 | 受控文件名前缀映射`product_id`，可登记规划中的销售包 | `実装済` |
| 商品主数据/包含关系 | 独立目录、组合商品和价格管理 | `未実装` |
| TEST/PRODUCTION | RC/正式版发布阶段区分 | `未実装` |

当前上传上限为 200 MiB，ZIP 条目上限为 10,000，解压总量上限为 1 GiB。系统通过配置中的受控基础名称列表识别商品，并将映射结果保存为`product_id`；价格、商品组合与销售文案不由本系统管理。

## 5. 客户领取与下载

| 机能 | 当前实现 | 状态 |
|---|---|---|
| 专属领取链接 | 摘要用于访问照合；新令牌以AES-GCM密文供管理员详情再次取得，旧摘要记录提示重发 | `実装済` |
| 链接查看 | 记录 `DELIVERY_VIEWED`，判断撤销、过期和准备中 | `実装済` |
| 下载次数 | 首次取得真实文件流时在数据库锁内消费一次 | `実装済` |
| 下载票据 | 随机令牌、摘要保存、当前有效期 120 秒 | `実装済` |
| 资料密码 | 12～64位可见ASCII、字母+数字、二次确认；不落库 | `実装済` |
| 客户水印/加密 | 每个Sheet页脚写入客户编号/交付编号；XLSX Agile加密 | `実装済` |
| 交付 ZIP/摘要 | 客户专属ZIP、SHA-256、生成状态与失败重试 | `実装済` |
| 文件传输 | `GET /api/v1/download-tickets/{ticket}`受控流式下载 | `実装済` |
| ASRAY账号 | HMAC幂等开通、一次性激活、商品别权限、共用训练案件、单会话 | `実装済` |
| 完整闭环 | PREPARING/WAITING_PASSWORD → READY/ISSUED → 实际下载 | `実装済` |

以上闭环已在本地Docker以模拟客户完成跨系统验证。正式服务器、正式客户、TLS与生产UAT仍未实施，不得把本地测试结果表述为生产发布完成。

客户管理采用简单版购买单元模型：同一显示名再次购买时仍建立新的`portal_customer`、`portal_delivery`、客户专属包和ASRAY账号，不依赖手机号或姓名合并客户。每条`portal_delivery`视为一笔订单；需要统计有效订单时排除`CANCELLED`状态即可。

ASRAY权限由受控商品ID映射：`DEMO_BASIC`提供共通业务，`DEMO_TEST`追加本人测试证迹，`DEMO_MANAGEMENT`追加本人计划与本人Report，`DEMO_FULL`提供三类训练权限。外部账号始终为`MEMBER`，不会取得ASRAY内部`MANAGER`或`ADMIN`。ASRAY服务端会重新计算商品权限并限制为本人数据与共用训练案件`EXT-TRAINING`；承认、真实案件管理、预测、系统管理和Master维护不对外部账号开放。

## 6. 数据库现状

当前 Flyway V1～V7 已建立：

- `portal_admin_user`
- `portal_customer`
- `portal_delivery`
- `portal_delivery_token`
- `portal_download_ticket`
- `portal_download_event`
- `portal_audit_log`
- `portal_package_release`
- `portal_delivery_package`
- `portal_asray_provisioning`

尚未建立：

- 商品主数据/组合关系表
- 重新发放履历表
- Batch 执行履历表
- 内容管理与 IT 日语共创相关表

## 7. 自动测试现状

本期Portal后端全量测试24件通过。追加测试确认无筛选、仅状态、仅关键字、状态与关键字组合四种交付查询均使用`createdAt DESC, id DESC`分页排序；交付一览使用当前分页一括Provisioning查询取得ASRAY User ID与账号状态，详情使用单件查询，并验证管理员响应不包含密码、Activation URL密文及内部错误。既有测试继续覆盖购买单元自动编号、客户包密码、水印、加密、母版不可变、商品ID至ASRAY Entitlement转换、请求体、响应照合及Provisioning状态保存。ASRAY后端既有全量回归844件通过。

本地Docker真实API验证使用同一显示名建立两笔订单：两笔均生成独立ASRAY账号，客户包状态为`READY`、链接状态为`AVAILABLE`；ASRAY数据库确认两个账号均为`DEMO_FULL`，各有`SIM_CORE_WORKFLOW`、`SIM_TEST_EVIDENCE`、`SIM_MANAGEMENT_OPERATIONS`三项有效权益并加入`EXT-TRAINING`。测试临时管理员已清理，既有管理员未修改。

以下测试尚不充分或尚不存在：

- Controller/Security/Session/CSRF 测试
- 高并发压力下的交付状态迁移和下载次数测试
- PostgreSQL Repository 结合测试
- Microsoft Excel/LibreOffice正式销售包全量目视测试
- 前端组件和浏览器操作测试
- 正式环境综合测试、正式客户UAT、备份恢复测试
