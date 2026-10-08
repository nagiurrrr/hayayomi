# Hayayomi

青空文庫などのテキストを読み込み、フラッシュ暗算のように文節を一つずつ表示する速読アプリ（RSVP 方式）。

## 特徴

- スマホ主体の PWA。PC ブラウザでも利用可能
- バックエンドなし。すべての処理をブラウザ内で完結
- 文節単位で表示するため、単語単位より読みやすい
- 表示速度はユーザーが調整可能

## 技術スタック

| 用途 | ライブラリ |
|---|---|
| フレームワーク | Vite + React + TypeScript |
| PWA 化 | vite-plugin-pwa |
| 文節分割 | BudouX |
| 保存（本棚・読書位置） | Dexie.js（IndexedDB） |
| zip 展開 | fflate |
| APK 化（予定） | Capacitor |

## 開発

```bash
npm install
npm run dev
npm run build
```
