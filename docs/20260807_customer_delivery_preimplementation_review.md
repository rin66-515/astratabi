# 客户专属资料交付制造前Review

## 1. 调查结论

| ID | 等级 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-001 | Major | 当前下载端点固定返回501，签票后没有真实文件 | 增加客户副本记录与受控流式下载 | Closed（设计） |
| RV-DLV-002 | Major | 如果先扣次数后发现文件不存在，会形成不可交付计数 | 只有READY文件可签票，并在签票前检查路径 | Closed（设计） |
| RV-DLV-003 | Major | 异步生成需要可逆保存客户密码 | 采用当前请求同步顺序生成，不持久化资料密码 | Closed（设计） |
| RV-DLV-004 | Major | Sheet保护不能阻止打开Excel | 使用OOXML Agile文件加密 | Closed（设计） |
| RV-DLV-005 | Major | 直接修改母版破坏不可变Release | 只在`.staging`生成客户副本并原子移动 | Closed（设计） |
| RV-DLV-006 | Medium | ASRAY登录密码与资料密码共用会扩大明文接触范围 | 两种密码完全分离 | Closed（设计） |
| RV-DLV-007 | Medium | ASRAY联动重试可能生成重复账号 | Event ID、Request hash和Nonce保证幂等/防重放 | Closed（设计） |
| RV-DLV-008 | Medium | Activation URL明文入库会扩大Bearer secret风险 | AES-GCM短期密文保存并支持重发 | Closed（设计） |

## 2. 制造范围

- Flyway V7及Entity/Repository
- 客户资料密码API、Excel/ZIP生成Service、下载Service
- ASRAY HMAC Client及失败重试
- 客户页面密码设置、生成状态、Activation链接和下载状态
- Java/React测试、PostgreSQL结合测试、跨系统本地测试
- 基本设计、Review、WBS、测试式样与结果反馈

## 3. 开始判定

密码最小化、母版不可变、生成原子性、下载次数、跨系统责任和失败恢复已确定，可以开始制造。正式客户验收与生产发布未实施。
