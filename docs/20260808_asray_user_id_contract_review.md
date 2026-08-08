# ASRAY User ID短縮化 連携Contract Review

## 1. 対象

- ASRAY開通Responseの`userId`
- `portal_asray_provisioning.asray_user_id`
- 顧客向けAccount表示
- 既存`ext-`Accountの互換性

## 2. 調査結果

| 観点 | 現行処理 | 判定 |
|---|---|---|
| 保存長 | `varchar(50)` | `asr-`＋8文字を格納可能 |
| Prefix検査 | なし | 製造変更不要 |
| 固定長検査 | なし | 製造変更不要 |
| 完了済みDelivery | 保存済みUser IDを返却 | 既存`ext-`を維持 |
| 顧客表示 | Response文字列をそのまま表示 | 新旧形式を表示可能 |

## 3. Review指摘

| ID | Severity | 指摘 | 対応 | Status |
|---|---|---|---|---|
| AT-RV-F-034 | Major | `asr-`Prefixだけを許可すると既存`ext-`Accountの再表示が失敗する | User IDを不透明文字列として扱い、Prefix検査を追加しない | Closed |
| AT-RV-F-035 | Medium | Contract Testが旧形式だけでは新規Responseの回帰を検知できない | Provisioning Testを`asr-7K3M9Q2D`へ更新し、Package Serviceの旧`ext-`Fixtureは互換確認として維持 | Closed |

## 4. 試験結果

- AstraTabi Backend全量：9件成功
- AstraTabi Frontend Build：成功
- ASRAY実HTTP：新規`asr-`形式、同一Event冪等及びDB関連を確認
- 既存`ext-`Account：ASRAY DB上4件すべてUser Linkを確認

## 5. 判定

AstraTabi本体のDB Migration及びProduction Code変更は不要とする。連携設計とContract Testを補正し、新旧User IDを不透明識別子として扱う境界を確定した。正式顧客UAT及び本番運用承認は未実施である。
