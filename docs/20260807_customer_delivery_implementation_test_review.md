# 客户专属资料交付・ASRAY账号联动 实装后Review

## 1. 对象

- AstraTabi客户资料密码设置、客户专属Excel加密、ZIP生成与真实下载
- AstraTabi至ASRAY的客户账号开通联动
- Flyway V7、Java/React测试、本地Docker跨系统验证

## 2. Review结果

| ID | 等级 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-009 | Major | 签票时扣次数会在客户未真正请求文件时消耗配额 | 改为首次取得真实文件流时，在锁内认领票据并计次 | Closed |
| RV-DLV-010 | Major | Docker共享网络中的服务名不稳定，跨项目联动失败 | ASRAY后端追加固定网络别名，AstraTabi只引用该别名 | Closed |
| RV-DLV-011 | Major | 本地联动开关关闭时，资料生成后账号开通失败 | 仅本地Compose默认开启；应用默认及样例保持关闭 | Closed |
| RV-DLV-012 | Medium | HTTP流开始后无法可靠判断客户端是否完整保存 | 事件定义为`DOWNLOAD_STARTED`，不伪造完成事件 | Closed |
| RV-DLV-013 | Medium | Activation URL属于Bearer secret，明文保存风险高 | AES-256-GCM密文保存，页面确认后不再重复展示 | Closed |

## 3. 测试成绩

| 层次 | 结果 | 主要确认点 |
|---|---|---|
| 后端单体 | 6件通过 | 密码错误/无密码拒绝、正确密码解密、水印、重复说明文件、母版不变 |
| 前端 | Build通过 | 密码设置、账号信息确认、下载操作的型与依赖整合 |
| PostgreSQL结合 | 通过 | Flyway V7、Hibernate schema validation、生成状态与联动状态保存 |
| 跨系统本地E2E | 通过 | READY/ISSUED、ASRAY开通/激活、权限、单会话、真实ZIP、SHA-256、次数上限 |
| 安全确认 | 通过（本地范围） | 明文资料密码未写入业务表，票据二次使用拒绝，旧JWT失效 |

跨系统E2E使用模拟客户和模拟管理员。临时管理员与临时文件已删除；业务测试交付记录保留在本地数据库中作为调查证据。未使用真实客户资料、正式服务器或生产Secret。

## 4. 未实施与Release判定

- 正式域名、TLS、正式对象存储、外部备份与监控：未实施
- Microsoft Excel/LibreOffice正式交付包全量目视确认：未实施
- 正式客户UAT、生产Go/No-Go：未实施/未判定

因此本记录只判定本地制造与测试范围完成，不代表生产发布承认。
