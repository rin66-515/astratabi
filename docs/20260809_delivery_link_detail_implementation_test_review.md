# 交付详情・当前有效链接表示 实装・测试Review

## 1. 管理情報

| 項目 | 内容 |
|---|---|
| 対象 | 管理员详情中的当前有效链接表示、复制、旧数据兼容与重发控制 |
| 管理番号 | WBS-109／RV-159／FB-150／BUG-038 |
| Review | RV-DLV-033～036 |
| 判定 | Local合格／正式密钥轮换・正式客户UAT・生产Go／No-Go未实施 |

## 2. 实装结果

- V9在`portal_delivery_token`追加可空的`token_ciphertext`。既有摘要记录不转换、不撤销。
- 新令牌继续保存64字符摘要，同时以独立密钥进行AES-256-GCM加密。
- 管理员一览DTO不含链接；详情DTO只返回当前有效链接及`AVAILABLE`／`LEGACY_UNRECOVERABLE`／`NONE`状态。
- 详情GET响应设置`Cache-Control: no-store`，Bearer链接不进入日志和审计JSON。
- 详情画面提供只读链接、复制和新窗口打开；旧记录提示重新发放，停止后不显示链接。
- 重发时旧令牌失效，新令牌成为唯一有效令牌；前端同步替换显示内容。

## 3. 测试结果

| 区分 | 结果 |
|---|---|
| AstraTabi Backend单体 | 20件通过、Failure 0、Error 0；新增7件链接详情／暗号测试 |
| AstraTabi Frontend | TypeScript／Vite生产Build通过 |
| Docker Build | Backend／Frontend镜像Build成功，三容器Healthy |
| PostgreSQL／Flyway | V9成功；`token_ciphertext VARCHAR(512) NULL`确认 |
| 管理API | 详情`AVAILABLE`、签发链接一致、`Cache-Control: no-store` |
| 一览API | 不包含`deliveryLink`字段 |
| 重发控制 | 旧链接404、新链接200／`PASSWORD_REQUIRED`；有效令牌1件 |
| 数据保全 | 测试交付的摘要64字符、密文96字符；明文URL 0件 |
| 旧数据兼容 | 既有摘要记录显示`LEGACY_UNRECOVERABLE`，原令牌未撤销 |
| Browser桌面 | 详情中链接表示、复制结果一致、复制完成消息确认 |
| Browser 900px | 详情层打开、链接／复制按钮表示、横向溢出0 |

结合测试使用专用交付`DL-20260809-E2E-LINK-20260809-0001`。一次性管理员在测试结束后登出并删除；交付记录、两次令牌履历及审计记录保留为本地证迹。

## 4. Review指摘与对应

| ID | 等级 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-028 | Major | 刷新后无法再次取得已发放链接 | 哈希照合与AES-GCM密文保存并用 | Closed |
| RV-DLV-029 | Major | 一览响应暴露链接会扩大影响范围 | 详情DTO分离，一览不含链接 | Closed |
| RV-DLV-030 | Major | 旧摘要无法逆算，迁移可能误废止链接 | NULL兼容并提示重新发放 | Closed |
| RV-DLV-031 | Medium | 复用ASRAY开户密钥会扩大影响范围 | 独立`PORTAL_DELIVERY_TOKEN_ENCRYPTION_KEY` | Closed |
| RV-DLV-032 | Medium | 停止／重发后页面可能残留旧链接 | 服务端详情再取得并清除／替换临时状态 | Closed |
| RV-DLV-033 | Major | GET详情可能被浏览器或代理缓存 | 明确设置`Cache-Control: no-store` | Closed |
| RV-DLV-034 | Medium | 事件API复用详情方法会无意义地执行解密 | 分离只读存在确认方法 | Closed |
| RV-DLV-035 | Medium | 900px详情层追加长链接后可能产生横向溢出 | 复用既有响应式链接布局并实测`scrollWidth=clientWidth` | Closed |
| RV-DLV-036 | Medium | 事件API失败时`Promise.all`会连带隐藏链接详情 | 详情与事件独立读取，事件失败只清空事件列表 | Closed |

## 5. 文档反馈

| ID | 来源 | 反馈 | 反映位置 | 状态 |
|---|---|---|---|---|
| FB-150 | 客服操作确认 | 已生成链接在详情中不可见，无法再次发送 | 基本设计、DB迁移、详情API、管理画面、运维手顺 | Closed |
| BUG-038 | 画面确认 | 生成结果只保存在页面临时状态，刷新后消失 | 服务端密文保存及详情再取得 | Closed |

## 6. 残存边界

- 生产密钥须由部署环境注入，不得使用Compose开发默认值。
- 当前密文没有密钥版本字段；正式密钥轮换前必须设计旧密钥保留或对有效链接统一重新发放，禁止直接替换密钥。
- 正式客户UAT、HTTPS环境缓存确认、生产备份／恢复及Go／No-Go未实施・未判定。
