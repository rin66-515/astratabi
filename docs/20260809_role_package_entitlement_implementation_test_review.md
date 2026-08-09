# 职种别Package・ASRAY账号权限联动 实装・测试Review

## 1. 管理情報

| 項目 | 内容 |
|---|---|
| 対象 | 四种职种别Package、Release唯一约束、ASRAY账号开通、客服速查表 |
| Review | RV-DLV-027 |
| 关联 | WBS-107／RV-158／FB-149／BUG-037 |
| 判定 | Local合格／正式客户UAT・生产Go／No-Go未实施 |

## 2. 实装结果

- `ASRAY_ROLE_DEVELOPER`与`ASRAY_ROLE_TEST`固定映射`DEMO_TEST`。
- `ASRAY_ROLE_OPERATIONS`与`ASRAY_ROLE_PM_PL`固定映射`DEMO_MANAGEMENT`。
- V8唯一约束按商品区分Release；同商品同版同日仍禁止覆盖。
- 管理画面显示商品名、版本、发布日期，并修正异步上传后的Form复位。
- 客服工作簿v1.1新增售价、包含内容、Product ID、账号权限、适用客户与说明重点。

## 3. 测试结果

| 区分 | 结果 |
|---|---|
| AstraTabi Backend | 13件通过、Failure 0、Error 0 |
| AstraTabi Frontend | TypeScript／Vite Build通过 |
| ASRAY Backend | 832件通过、Failure 0、Error 0 |
| ASRAY Frontend | 207件通过、Build通过 |
| PostgreSQL | V8成功；唯一约束`project_code, base_name, version, release_date`确认 |
| 本地发行联动 | 四职种Package均`ISSUED`、Provisioning `COMPLETED` |
| ASRAY权益 | Developer／Test=CORE＋TEST、Operations／PM・PL=CORE＋MANAGEMENT |
| 训练案件 | 四账号均以`MEMBER`、100%加入`EXT-TRAINING` |
| Browser | 四账号菜单符合权限；开发账号直达计划、PM账号直达管理均被拒绝 |
| 客服Excel | 8 Sheet、公式错误0、全Sheet渲染确认、内部生成痕迹0 |

## 4. Review指摘与对应

| ID | 等级 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-022 | Major | 白名单不含职种Package | 四个base name受控追加并测试 | Closed |
| RV-DLV-023 | Major | Product ID映射缺失 | 固定映射并由ASRAY再计算照合 | Closed |
| RV-DLV-024 | Major | 同版同日多商品被唯一约束拒绝 | V8将base name纳入唯一Key | Closed |
| RV-DLV-025 | Medium | 选择项不能识别商品 | 显示base name／version／date | Closed |
| RV-DLV-026 | Medium | RC候选可能被误作正式母版 | 保持正式命名与SHA-256规则 | Closed |
| RV-DLV-027 | Major | 异步上传后`event.currentTarget`失效 | 提前保存Form引用并实际上传复测 | Closed（BUG-037） |

## 5. 残存边界

正式销售价格仍为个人许可建议价，须由负责人批准。源码包尚未配置自动开户。正式支付API、正式域名、TLS、正式客户UAT、生产备份监控与Go／No-Go未实施。
