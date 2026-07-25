# AstraTabi Portal

「雲と月をたずさえて、遠くへ。」を掲げる個人 IP ポータルです。第一版は React + TypeScript + Vite による静的フロントエンドです。

## ローカル起動

```powershell
cd C:\Users\admin\Documents\Codex\2026-07-12\zai\astratabi-portal
npm.cmd run dev
```

ブラウザで `http://127.0.0.1:18100/` を開きます。

## 第一版の範囲

- 公開ページ：IP ストーリー、一句日記、IT 日本語・交流角、制作・協働
- 顧客交付物受取ページの UI モック
- 配布管理画面の設計モックと将来 API の境界

入金確認、Excel 透かし、ZIP 生成、実ダウンロード、認証、ダウンロード回数制限は、後続のバックエンド実装で接続します。

## 将来 API（予定）

- `GET /api/v1/deliveries/{token}`
- `POST /api/v1/admin/deliveries`
- `POST /api/v1/admin/deliveries/{id}/publish`
- `GET /api/v1/deliveries/{token}/download`
