# 职种别Package・ASRAY账号权限联动 製造前Review

## 1. 対象

- 四种职种别Package的母版登记与商品ID转换
- 同一版本・同一发布日期下的多商品Release
- 客服确认收款后的交付建立、ASRAY账号开通与权限照合
- 客服速查表中的价格、内容、权限和销售状态

## 2. 確定事項

| Package | product_id | Entitlement | 外部Role |
|---|---|---|---|
| ASRAY_ROLE_DEVELOPER | DEMO_TEST | SIM_CORE_WORKFLOW、SIM_TEST_EVIDENCE | MEMBER |
| ASRAY_ROLE_TEST | DEMO_TEST | SIM_CORE_WORKFLOW、SIM_TEST_EVIDENCE | MEMBER |
| ASRAY_ROLE_OPERATIONS | DEMO_MANAGEMENT | SIM_CORE_WORKFLOW、SIM_MANAGEMENT_OPERATIONS | MEMBER |
| ASRAY_ROLE_PM_PL | DEMO_MANAGEMENT | SIM_CORE_WORKFLOW、SIM_MANAGEMENT_OPERATIONS | MEMBER |

ASRAY侧现有四级ProductEntitlementPolicyを再利用する。职种名を内部Roleへ変換せず、外部Accountの管理機能・承認・案件管理・予実管理は禁止を維持する。

## 3. Review結果

| ID | 等级 | 指摘 | 对应 | 状态 |
|---|---|---|---|---|
| RV-DLV-022 | Major | 现行允许商品清单不含四种职种别Package，正式ZIP不能登记 | 受控白名单追加四个base name并增加上传测试 | Closed（设计） |
| RV-DLV-023 | Major | 商品ID转换未定义，购买后ASRAY开通会在上传阶段被拒绝 | Developer／Test映射DEMO_TEST，Operations／PM・PL映射DEMO_MANAGEMENT | Closed（设计） |
| RV-DLV-024 | Major | 唯一约束只按Project、Version、Date判定，同日同版其他商品无法登记 | V8改为Project、Base Name、Version、Date唯一，Service查询同步修正 | Closed（设计） |
| RV-DLV-025 | Medium | 管理画面下拉项只显示版本和日期，多个商品容易误选 | 显示base name、version、release date，列表继续显示完整文件名 | Closed（设计） |
| RV-DLV-026 | Medium | RC2候选文件名不符合正式母版命名规则 | 不放宽校验；正式发行时去除RC标识并重算SHA-256 | Closed（设计） |

## 4. 受入条件

- 四种正式命名岗位包均可登记，同一版本和日期可以并存。
- 同一商品、版本和日期仍因不可变约束被拒绝。
- 建立交付后发送的`productIds`及`entitlements`与上表一致。
- ASRAY开通结果中的Entitlement一致，账号Role为MEMBER并加入`EXT-TRAINING`。
- 外部账号不能访问承认、案件管理、予实管理及系统管理。
- 客服表能从一页确认售价、内容、系统权限、自动开户状态和禁止承诺事项。

## 5. 判定

RV-DLV-022～026的设计对应已确定，可以进入制造。正式微信支付API、正式域名、TLS、正式客户UAT及生产Go／No-Go不在本次Local范围内，维持未实施・未判定。
