# Hayayomi

青空文庫などのテキストを読み込み、フラッシュ暗算のように文節を一つずつ表示する速読アプリ（RSVP 方式）。
※RSVP: Rapid Serial Visual Presentation／高速逐次視覚提示。画面の同じ場所に言葉を次々と映す読み方

## 特徴

- スマホ主体の PWA。PC ブラウザでも利用可能
- ユーザーのデータはブラウザの中だけに保存。サーバー側は、青空文庫の取得を中継するだけ
- 青空文庫のアクセスランキングから、おすすめの作品をそのまま取り込める
- 文節単位で表示するため、単語単位より読みやすい
- 表示速度はユーザーが調整可能

※PWA: Web サイトを、スマホのアプリのようにホーム画面に置いて使える仕組み。オフラインでも動く

※中継: 青空文庫はほかのサイトから直接読み込むこと（CORS）を許していないため、Cloudflare Workers 上の小さなプログラムが代わりに取ってくる

※文節: 「速読し／やすく／なる」のように、日本語として自然に区切れるかたまり

## 技術スタック

| 用途 | ライブラリ | ひとことで |
|---|---|---|
| フレームワーク | Vite + React + TypeScript | 画面を作る道具一式。Vite は開発用サーバーとビルド、React は画面の部品作り、TypeScript は型の付いた JavaScript |
| PWA 化 | vite-plugin-pwa | PWA に必要な設定を自動で作る |
| 文節分割 | BudouX | Google 製。日本語の文章を文節に区切る |
| 保存（本棚・読書位置） | Dexie.js（IndexedDB） | IndexedDB はブラウザの中のデータ置き場。Dexie.js はそれを扱いやすくする |
| zip 展開 | fflate | zip ファイルを開く |
| UI 部品 | MUI | ボタンやスライダーなどの部品集。見た目は tsx の中に `sx` で書く |
| 青空文庫の中継 | Cloudflare Workers（wrangler） | 無料枠で動くサーバー側のプログラム。ランキングの結果は Workers KV に 1 日置く |
| APK 化（予定） | Capacitor | Web アプリを Android アプリに包む。APK は Android アプリを入れるためのファイル |

## 使い方

### おすすめから読む

アプリを開くと、青空文庫の最新の年間アクセスランキングの上位 100 作品が並ぶ。「読む」を押すとその作品を取り込む。

### ほかの作品を読む

1. 青空文庫（https://www.aozora.gr.jp/ ）で読みたい作品の図書カードページを開く
2. 「ファイルのダウンロード」から「テキストファイル(ルビあり)」の zip をダウンロードする
3. アプリの「ファイルを選ぶ」で zip（または展開した .txt）を選ぶ

## ディレクトリ構成

機能ごとにフォルダを分けている。画面（`src/`）と青空文庫の中継（`worker/`）を一つのリポジトリに置いている（モノレポ）。

```
shared/               画面と Worker の両方が使う型（API の返す形）
worker/               青空文庫の中継（Cloudflare Workers）
├── wrangler.jsonc    Worker の設定（名前・許可する Origin・KV）
└── src/
    ├── index.ts      入口。CORS、KV への保存
    └── aozora.ts     ランキング・図書カードのページの読み取り
src/
├── main.tsx          起動処理（テーマの適用など）
├── App.tsx           画面の切り替え
├── theme.ts          MUI のテーマ（ライト / ダーク）
├── features/         機能ごとのフォルダ
│   ├── import/       取り込み（ファイル・zip の読み込み、青空文庫の書式の整形）
│   ├── reader/       表示（全文表示、文節を一つずつ表示）
│   └── library/      おすすめ一覧、本棚（予定）
├── storage/          保存処理（予定）。Dexie.js を使う処理はここに集める
└── components/       複数の機能で使う部品（必要になったら作る）
```

※テーマ: 色や文字の大きさなど、アプリ全体の見た目の設定

## 開発

Node.js 22.18 以降（LTS の 24 を推奨）が必要。

```bash
npm install    # 必要なライブラリを入れる
npm run dev    # 開発用サーバーを起動する
npm run build  # 公開用のファイルを dist フォルダに作る
```

### Worker（青空文庫の中継）

画面の開発用サーバーは、`.env.development` の `VITE_API_URL`（`http://localhost:8787`）の Worker を使う。別のターミナルで Worker も起動しておく。

```bash
cd worker
npm install
npm run dev        # http://localhost:8787 で起動する
npm run typecheck  # 型チェック
npm run types      # wrangler.jsonc を変えたら、型（worker-configuration.d.ts）を作り直す
```

公開先の URL は `.env.production` に書く。

### 公開

`main` に push すると GitHub Actions が公開する。

- 画面: `.github/workflows/deploy.yml` が GitHub Pages に公開する
- Worker: `worker/` か `shared/` が変わった時に `.github/workflows/deploy-worker.yml` が Cloudflare に公開する。GitHub の Secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` が必要

※API トークンは Cloudflare のダッシュボードの「API トークン」から、テンプレート「Cloudflare Workers を編集する」で作る

### スマホで確かめる

```bash
npm run dev -- --host  # 同じ Wi-Fi の端末から開けるように起動する
```

表示された `Network:` の URL（例: `http://192.168.1.12:5173/`）を、PC と同じ Wi-Fi につないだスマホで開く。

開けない時は次を確かめる。

- Windows ファイアウォールで Node.js の通信が許可されているか
- iPhone の場合、設定 →「プライバシーとセキュリティ」→「ローカルネットワーク」で、使っているブラウザが許可されているか
