# 客服交付一览 最新生成顺 实装・测试Review

## 1. 管理信息

| 项目 | 内容 |
|---|---|
| 管理番号 | WBS-112／CHG-021 |
| Review | RV-DLV-041～043 |
| 对象 | Portal客服交付一览、分页与筛选查询 |
| 实施日 | 2026-08-16 |
| 开发者セルフレビュー | `実施済` |
| 生产发布判定 | `未判定` |

## 2. 需求与原因

客服交付一览应优先显示刚生成的交付记录。原实现只指定页码和每页件数，没有向Spring Data传递排序条件；因此显示顺序依赖数据库执行计划，无法保证最新记录位于第一页，也无法保证翻页结果稳定。

本期将后台查询固定为`created_at DESC, delivery_id DESC`。第一排序键体现业务要求，第二排序键处理生成时刻相同的记录并固定分页边界。有效期、状态变化时间和交付编号日期不作为生成顺序依据。

## 3. 实装内容

| 区分 | 对应 |
|---|---|
| Service | `DeliveryService.list`建立`PageRequest`时指定`createdAt DESC, id DESC` |
| 查询范围 | 无筛选、状态筛选、关键字搜索、状态＋关键字搜索共用相同排序 |
| Repository | 不新增重复查询方法，不修改既有JPQL |
| DB | 不变更表结构；既有`status, created_at DESC`索引继续可用于状态筛选 |
| Frontend | 不变更；继续按API返回顺序显示 |
| 兼容性 | 既有API参数、响应结构、页码和每页件数不变 |

## 4. Review指摘与对应

| ID | 重要度 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-041 | Major | 未指定排序时，客服一览的最新记录位置不确定 | 在共通`Pageable`中固定`createdAt DESC` | Closed |
| RV-DLV-042 | Medium | 仅按生成时刻排序时，同一时刻记录可能跨页重复或遗漏 | 追加唯一的`id DESC`作为第二排序键 | Closed |
| RV-DLV-043 | Medium | 筛选查询可能遗漏排序规则 | 单体测试覆盖四种筛选组合，并确认均向Repository传递相同排序 | Closed |

## 5. 测试结果

| 测试层 | 结果 | 证迹 |
|---|---|---|
| 定向单体测试 | PASS | `DeliveryServiceListOrderTest` 1件、Failure 0、Error 0 |
| Portal后端全量回归 | PASS | 22件、Failure 0、Error 0、Skipped 0 |
| Docker构建 | PASS | Java 21容器内完成主代码及测试代码编译，后端镜像生成成功 |
| 本地后端起动 | PASS | Compose重建后`actuator/health`返回`UP`，容器`healthy` |
| PostgreSQL只读照合 | PASS | 既有数据前8件按`created_at DESC, delivery_id DESC`查询为非递增顺序 |
| 管理页面登录后目视 | `未実施` | 浏览器没有Portal管理员会话；未代填管理员密码，未对业务数据执行操作 |

Windows本机Maven在访问本地依赖JAR时发生`AccessDeniedException`，因此正式测试证迹改由只读源码挂载的Linux Maven容器取得。该问题属于本机Maven／文件访问环境，不属于本次业务代码障害。

## 6. 文档反馈

- 基本设计书的管理API与页面对应表追加默认排序及第二排序键。
- 当前实现一览更新为“按生成时刻及交付ID稳定倒序”。
- 决策记录追加DEC-018；数据库迁移、API响应和前端布局均无变更。

## 7. 残存风险与结论

- 当前索引以`status, created_at DESC`为主；数据量显著增加后，应使用实际执行计划评估无状态筛选时是否需要`created_at DESC, delivery_id DESC`复合索引。本期数据量不追加推测性索引。
- 正式VPS、正式数据量性能、生产UAT与Go／No-Go仍为`未実施`或`未判定`。
- 代码、自动测试、Docker起动和本地数据库证迹一致，客服交付一览的稳定倒序受入条件满足。
