# AstraTabi Portal

「云月小铺」を世界观として育てる个人 IP 门户。公开侧使用 React + TypeScript + Vite，交付后台使用 Java 21 / Spring Boot / PostgreSQL。

## 项目说明与后续计划

当前实现范围、未完成边界、后续制造路线、运维发布要求和决策记录统一维护在 [docs/project-overview/README.md](docs/project-overview/README.md)。

阅读这些说明时，以 `実装済`、`設計確定`、`設計提案`、`未実装` 和 `未試験` 区分实际完成情况，不能把规划或页面占位视为已完成机能。

## 本地一键启动（推荐）

本地 Docker 同时运行 React 静态前端、Java 21 后端和 PostgreSQL；这不是正式服务器部署配置。

```powershell
cd <astratabi-portal项目根目录>
docker compose up -d --build
docker compose ps
```

容器全部健康后访问 `http://127.0.0.1:18100/`。前端会把 `/api` 转发至后端容器，后端也可通过 `http://127.0.0.1:18082/actuator/health` 单独检查。

停止服务但保留 PostgreSQL 和私有资料包：

```powershell
docker compose down
```

代码修改后重新构建前后台：

```powershell
docker compose up -d --build frontend backend
```

本地默认管理员初始值只对“全新数据库卷”生效：

- 登录 ID：`admin-001`
- 初始密码：`astratabi-local-admin`
- 已有数据库中的密码不会被 Compose 自动覆盖。

如需覆盖本地默认值，将 `.env.example` 复制为 `.env` 后修改。`.env` 已被 Git 忽略，禁止放入正式服务器 Secret。

持久化卷：

- `astratabi-postgres-data`：数据库。
- `astratabi-package-data`：不可变母版 ZIP 与 `.sha256`。

不要用 `docker compose down -v`，除非明确要删除全部本地数据库与资料包。

## 使用本机 Node 与 Maven 启动（可选）

```powershell
cd <astratabi-portal项目根目录>
npm.cmd run dev
```

ブラウザで `http://127.0.0.1:18100/` を開きます。

后端本机启动需要 PostgreSQL、管理员初始密码与稳定的令牌 pepper：

```powershell
docker compose up -d postgres
cd backend
$env:PORTAL_BOOTSTRAP_ADMIN_PASSWORD = '<仅首次启动使用的密码>'
$env:PORTAL_TOKEN_PEPPER = '<开发环境固定且不得提交的随机长字符串>'
$env:PORTAL_COOKIE_SECURE = 'false'
mvn.cmd spring-boot:run
```

后端监听 `http://127.0.0.1:18082`，Vite 将 `/api` 代理到该端口。生产环境必须恢复 Secure Cookie 并使用 HTTPS。

## 第一版の範囲

- 公開ページ：IP ストーリー、一句日記、IT 日本語・交流角、制作・協働
- 客户交付物领取页面及真实令牌摘要 API
- 单管理员认证、交付记录、链接、撤销、审计与 PostgreSQL 迁移
- 私有母版 ZIP 上传、SHA-256 校验、不可变版本/归档管理
- 新建交付时固定引用一个有效母版版本
- 客户设置资料打开密码、逐 Sheet 水印、XLSX Agile 加密、客户专属 ZIP 与 SHA-256
- 一次性下载票据、真实 ZIP 流式下载与首次取流计次
- HMAC 幂等开通 ASRAY 账号、一次性激活与单会话登录

上述交付闭环已在本地 Docker 通过自动测试与跨系统 E2E。正式服务器、TLS、外部备份、正式客户 UAT 与 Go/No-Go 仍未实施。人工微信收款继续作为运营流程，不接支付 API。

## 《云月浮生》游戏 MVP

《云月浮生》是云月小铺内的独立文字叙事 feature。启动前端后可直接访问：

```text
http://127.0.0.1:18100/#fusheng
```

也可从“百工坊”的固定作品入口进入。首页“今日木牌”会按日期稳定地偶尔显示入卷文案；同一天刷新页面不会反复变化。

当前内容为第一卷“极东”的序章、2024 年 8 月完整流程和 9 月预告。存档保存在浏览器 `localStorage`，不上传后台；清除浏览器数据或更换设备后无法继续原存档。

### 增加一个新事件

1. 在 `src/features/yunyue-fusheng/data/events/` 对应月份文件中新增 `GameEvent`。
2. 使用唯一 `id`，并提供中日双语 `title`、`text` 和 `options`。
3. 数值变化统一写入 `effects`，不要在 React 页面中判断具体事件 ID。
4. 前置条件使用 `stat`、`flag`、`completedEvent` 或 `month`；随机事件设置 `weight`。
5. 新增因果事件时，先由前一事件写入 flag，再由后续事件检查 flag，避免纯随机剧情。
6. 运行 `npm.cmd test`、`npm.cmd run lint` 和 `npm.cmd run build`。

### 增加一种新语言

1. 扩展 `src/features/yunyue-fusheng/types/game.ts` 中的 `Language`。
2. 扩展 `LocalizedText`，并为所有事件和界面固定文案补充该语言。
3. 在 `LanguageSwitch` 增加可访问的切换按钮。
4. 在 `localize()` 与日期/金额格式化处增加对应 locale。
5. 完整游玩序章、一个月份、月末总结和预告，确认没有回退成其他语言。

### 扩展第二个月

1. 新建 `data/events/secondMonth.ts`，月份设为 `9`。
2. 先定义工资到账、固定支出、最低还款和“寻找额外收入”解锁事件，再增加随机池。
3. 月末切换时结算工资、利息和最低还款，并在保存数据中更新月份。
4. 继续复用 `applyEffects()`、条件系统和权重抽取，不在页面组件内增加月份分支。
5. 存档结构发生变化时提高 persist `version` 并提供迁移函数，不能让旧存档静默损坏。

游戏代码入口为 `src/features/yunyue-fusheng/YunyueFusheng.tsx`；事件引擎、内容、状态和样式均在该 feature 内独立维护。

## 主要 API

- `GET /api/v1/deliveries/{token}`
- `POST /api/v1/admin/deliveries`
- `GET /api/v1/admin/package-releases`
- `POST /api/v1/admin/package-releases`（multipart: `archive` + `checksum`）
- `POST /api/v1/admin/package-releases/{id}/archive`
- `POST /api/v1/deliveries/{token}/document-password`
- `POST /api/v1/deliveries/{token}/download-tickets`
- `GET /api/v1/download-tickets/{ticket}`

本地验证账号联动时，应先启动 ASRAY 的 Docker Compose，使其后端加入共享 `dev-lab-proxy` 网络。AstraTabi 应用默认配置不会自动启用外部账号开通；非本地环境必须显式设置独立 Client ID、HMAC Secret 与 Activation 加密密钥。

测试用模拟母版位于 `dev-fixtures/`。正式包名称确认后替换测试件，不改变版本管理 API。
