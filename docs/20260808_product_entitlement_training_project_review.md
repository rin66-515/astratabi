# 商品別ASRAY権限・共通演習案件 連携Review

## 1. 対象

- AstraTabiの商品IDからASRAY Entitlementへの変換
- ASRAY応答Entitlementとの照合
- Provisioning完了・失敗状態の永続化
- ASRAY側の共通演習案件、外部Accountの限定権限、Cross-customer防止との連携

## 2. 商品Mapping

| 商品ID | ASRAY Entitlement |
|---|---|
| `DEMO_BASIC` | `SIM_CORE_WORKFLOW` |
| `DEMO_TEST` | `SIM_CORE_WORKFLOW`、`SIM_TEST_EVIDENCE` |
| `DEMO_MANAGEMENT` | `SIM_CORE_WORKFLOW`、`SIM_MANAGEMENT_OPERATIONS` |
| `DEMO_FULL` | 上記3件 |

商品IDから権利を決める責任は双方に置く。AstraTabiは正規Matrixを送信し、ASRAYは受信値を信頼せず同じMatrixを再計算する。不一致時はAccountを発行しない。

## 3. Review結果

| ID | 等级 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-017 | Major | Portal側だけで権利を決めると設定差異・改ざん時に過剰権限となる | ASRAY側でも商品IDから再計算し、応答権利をPortalで再照合 | Closed |
| RV-DLV-018 | Major | 管理演習商品へASRAY管理職Roleを付与すると実案件・他顧客Dataへ到達し得る | 外部RoleはMEMBER固定、自己計画・自己Reportだけを専用Entitlementで許可 | Closed |
| RV-DLV-019 | Major | 外部HTTP後のProvisioning状態変更が明示保存されない | 成功、商品不一致、HTTP失敗の各経路で`saveAndFlush` | Closed（BUG-034） |
| RV-DLV-020 | Medium | 未定義商品を送信すると原因が不明確 | `PRODUCT_NOT_SUPPORTED`として発行前に失敗 | Closed |
| RV-DLV-021 | Medium | 再送時に共通案件所属が欠落したままになる可能性 | ASRAY側の同一Event再送で権利・所属を冪等Repair | Closed |

## 4. 测试成绩

| 层次 | 结果 | 主要确认点 |
|---|---|---|
| Portal后端全量 | 9件通过 | `DEMO_TEST`请求体、2项Entitlement、旧统一权限不发送、响应照合、状态保存 |
| Portal前端 | Build通过 | 既有交付详情、链接复制、响应式详情显示未回归 |
| ASRAY后端全量 | 825件通过 | 商品Matrix、外部Authority、共通所属、Login与Security |
| PostgreSQL结合 | 通过 | V10、既存外部Account迁移、旧权限撤销、所属1件 |
| 跨系统本地验证 | 通过 | 同一发放Event返回同一User，商品相应权限和共通案件所属不重复 |

## 5. 判定

Local制造、双方契约、回归与模拟客户验证完成。正式销售数据、生产Secret、TLS、正式客户UAT与生产Go／No-Go未实施，不在本记录的合格范围内。
