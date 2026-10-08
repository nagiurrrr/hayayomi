# Hayayomi

青空文庫などのテキストを読み込み、フラッシュ暗算のように文節を一つずつ表示する速読アプリ（RSVP 方式）。
※RSVP: Rapid Serial Visual Presentation／高速逐次視覚提示。画面の同じ場所に言葉を次々と映す読み方

## 特徴

- スマホ主体の PWA。PC ブラウザでも利用可能
- バックエンドなし。すべての処理をブラウザ内で完結
- 文節単位で表示するため、単語単位より読みやすい
- 表示速度はユーザーが調整可能

※PWA: Web サイトを、スマホのアプリのようにホーム画面に置いて使える仕組み。オフラインでも動く

※バックエンド: データを預かるサーバー側のプログラム。このアプリには無い

※文節: 「速読し／やすく／なる」のように、日本語として自然に区切れるかたまり

## 技術スタック

| 用途 | ライブラリ | ひとことで |
|---|---|---|
| フレームワーク | Vite + React + TypeScript | 画面を作る道具一式。Vite は開発用サーバーとビルド、React は画面の部品作り、TypeScript は型の付いた JavaScript |
| PWA 化 | vite-plugin-pwa | PWA に必要な設定を自動で作る |
| 文節分割 | BudouX | Google 製。日本語の文章を文節に区切る |
| 保存（本棚・読書位置） | Dexie.js（IndexedDB） | IndexedDB はブラウザの中のデータ置き場。Dexie.js はそれを扱いやすくする |
| zip 展開 | fflate | zip ファイルを開く |
| APK 化（予定） | Capacitor | Web アプリを Android アプリに包む。APK は Android アプリを入れるためのファイル |

## 開発

```bash
npm install    # 必要なライブラリを入れる
npm run dev    # 開発用サーバーを起動する
npm run build  # 公開用のファイルを dist フォルダに作る
```
