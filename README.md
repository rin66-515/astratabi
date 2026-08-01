# AstraTabi Portal

「云月小铺」を世界观として育てる个人 IP 门户。公开侧使用 React + TypeScript + Vite，交付后台使用 Java 21 / Spring Boot / PostgreSQL。

## 本地一键启动（推荐）

本地 Docker 同时运行 React 静态前端、Java 21 后端和 PostgreSQL；这不是正式服务器部署配置。

```powershell
cd C:\Users\admin\Documents\Codex\2026-07-12\zai\astratabi-portal
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
cd C:\Users\admin\Documents\Codex\2026-07-12\zai\astratabi-portal
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

仍待后续实现：客户专属 Excel 水印副本、交付 ZIP 生成、真实文件下载与下载票据消费闭环。人工微信收款继续作为运营流程，不接支付 API。

## 主要 API

- `GET /api/v1/deliveries/{token}`
- `POST /api/v1/admin/deliveries`
- `GET /api/v1/admin/package-releases`
- `POST /api/v1/admin/package-releases`（multipart: `archive` + `checksum`）
- `POST /api/v1/admin/package-releases/{id}/archive`
- `POST /api/v1/deliveries/{token}/download-tickets`

测试用模拟母版位于 `dev-fixtures/`。正式包名称确认后替换测试件，不改变版本管理 API。
