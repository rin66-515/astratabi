# 管理员交付一览・详情 ASRAY账号表示 实施・测试・Review结果

## 1. 管理信息

| 项目 | 内容 |
|---|---|
| 管理编号 | WBS-113／CHG-022 |
| 设计反馈 | FB-DLV-022 |
| Review | RV-DLV-044～RV-DLV-047 |
| 实施日 | 2026-08-16 |
| 对象 | AstraTabi Portal管理员交付一览、交付详情、管理员API |

## 2. 实施结果

| 对象 | 实施内容 | 判定 |
|---|---|---|
| 管理员交付一览API | 对当前分页的Delivery ID一括取得Provisioning，返回`asrayUserId`与`asrayAccountStatus` | PASS |
| 管理员交付详情API | 以Delivery ID取得单件Provisioning并返回账号信息 | PASS |
| 桌面一览 | 追加“ASRAY账号”列，有账号时显示User ID，无账号时显示“未发行” | PASS |
| 中小屏一览 | 交付Card内显示ASRAY账号或“未发行” | PASS |
| 交付详情 | 显示只读账号输入框、状态文案及“复制账号”按钮；Clipboard API失败时选中文本并提示`Ctrl+C` | PASS |
| 状态表示 | `ACTIVE`、`PENDING_ACTIVATION`、`SUSPENDED`、`EXPIRED`、`REVOKED`均有对应客服文案 | PASS |
| 信息保护 | 管理员响应仅增加User ID与账号状态；不返回资料密码、登录密码、Activation URL密文、签名或Provisioning内部错误 | PASS |

## 3. Review指摘与对应

| Review ID | 指摘 | 对应 | 状态 |
|---|---|---|---|
| RV-DLV-044 | 客服无法从交付记录确认ASRAY账号 | 一览和详情追加User ID表示 | Closed |
| RV-DLV-045 | 一览逐行取得Provisioning可能发生N+1 | 仅对当前Page执行一次`delivery_id IN (...)`查询 | Closed |
| RV-DLV-046 | 复制功能需要考虑Clipboard API不可用 | 增加文本选中与`Ctrl+C`退化路径 | Closed |
| RV-DLV-047 | 不得因客服便利性扩大敏感字段 | DTO契约测试确认密码、密文、内部错误不对外 | Closed |

## 4. 测试成绩

| 测试 | 结果 | 证迹 |
|---|---|---|
| Portal后端针对测试 | PASS | 7件／Failure 0／Error 0 |
| Portal后端全量回归 | PASS | 24件／Failure 0／Error 0（Linux Docker） |
| React生产构建 | PASS | `npm.cmd run build` |
| Docker构建・启动 | PASS | frontend、backend、postgres全部Healthy；前端HTTP 200；Actuator `UP` |
| 本地浏览器启动 | PASS | 重建后管理台可从`http://127.0.0.1:18100/#admin`进入，页面标题及登录表单正常显示 |
| 管理员认证后人工目视 | 未实施 | 既有PostgreSQL中的管理员密码已非Compose初始值；为避免修改既有账号或业务数据，本次不重置密码、不伪造会话 |
| 正式TLS／客户UAT／Go-No-Go | 未实施／未判定 | 正式服务器实施时另行验证 |

## 5. 环境备注

本机Maven回归因既有`.m2`目录访问权限被拒绝，改在Java 21 Linux一次性Maven容器中执行。较早轮次使用的项目内临时Maven缓存已删除，未进入Git；最终回归使用容器内匿名缓存，容器结束后自动废弃。该环境问题不影响Docker全量测试与应用镜像构建结果。

## 6. 结论

FB-DLV-022的设计、制造、自动测试及Review指摘已关闭。客服可在交付一览和详情中照合并复制客户ASRAY User ID，同时不扩大密码等敏感信息的暴露范围。管理员认证后的最终人工目视属未实施项，待持有现行本地密码的管理员执行。
