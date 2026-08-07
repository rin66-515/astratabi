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
