# Hayayomi

青空文庫などのテキストを読み込み、フラッシュ暗算のように文節を一つずつ表示する速読アプリ（RSVP 方式）。
※RSVP: Rapid Serial Visual Presentation／高速逐次視覚提示。画面の同じ場所に言葉を次々と映す読み方

**▶ アプリを開く: https://nagiurrrr.github.io/hayayomi/**

## 特徴

- スマホ主体の PWA。PC ブラウザでも利用可能
- ユーザーのデータはブラウザの中だけに保存。サーバー側は、青空文庫の取得を中継するだけ
- 青空文庫のアクセスランキングから、おすすめの作品をそのまま取り込める
- 文節単位で表示するため、単語単位より読みやすい
- スマホで読みやすいよう、文節を縦書きで表示する
- 表示速度はユーザーが調整可能。読了までの残り時間も出る
- 青空文庫のテキストのほか、DRM の無い EPUB も読める

※PWA: Web サイトを、スマホのアプリのようにホーム画面に置いて使える仕組み。オフラインでも動く

※中継: 青空文庫はほかのサイトから直接読み込むこと（CORS）を許していないため、Cloudflare Workers 上の小さなプログラムが代わりに取ってくる

※文節: 「速読し／やすく／なる」のように、日本語として自然に区切れるかたまり

## 技術スタック

| 用途                   | ライブラリ                     | ひとことで                                                                                                    |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| フレームワーク         | Vite + React + TypeScript      | 画面を作る道具一式。Vite は開発用サーバーとビルド、React は画面の部品作り、TypeScript は型の付いた JavaScript |
| PWA 化                 | vite-plugin-pwa                | PWA に必要な設定を自動で作る                                                                                  |
| 文節分割               | BudouX                         | Google 製。日本語の文章を文節に区切る                                                                         |
| 保存（本棚・読書位置） | Dexie.js（IndexedDB）          | IndexedDB はブラウザの中のデータ置き場。Dexie.js はそれを扱いやすくする                                       |
| zip 展開               | fflate                         | zip ファイルを開く                                                                                            |
| 画面遷移               | react-router                   | 一覧と読む画面を切り替える。GitHub Pages で動くよう、URL の `#` の後ろで画面を分ける（HashRouter）            |
| UI 部品                | MUI                            | ボタンやスライダーなどの部品集。見た目は tsx の中に `sx` で書く                                               |
| 青空文庫の中継         | Cloudflare Workers（wrangler） | 無料枠で動くサーバー側のプログラム。ランキングの結果は Workers KV に 1 日置く                                 |
| 整形                   | Prettier                       | コードの書き方（ダブルクォート・セミコロンなど）を自動で揃える                                                |
| APK 化（予定）         | Capacitor                      | Web アプリを Android アプリに包む。APK は Android アプリを入れるためのファイル                                |

## 使い方

### おすすめから読む

アプリを開くと、青空文庫の最新の年間アクセスランキングの上位 100 作品が並ぶ。「読む」を押すとその作品を取り込む。

### ほかの作品を読む

1. 青空文庫（https://www.aozora.gr.jp/ ）で読みたい作品の図書カードページを開く
2. 「ファイルのダウンロード」から「テキストファイル(ルビあり)」の zip をダウンロードする
3. アプリの「手元のファイルを読む」で zip（または展開した .txt）を選ぶ

### EPUB を読む

「手元のファイルを読む」で .epub を選ぶ。読めるのは DRM（コピーを防ぐ仕組み）の無い EPUB だけ。DRM 付きのもの（Kindle など）は「DRM で保護されているため読み込めません」と出る。

DRM の無い EPUB は、技術書の出版社（技術評論社の Gihyo Digital Publishing、達人出版会、オライリー・ジャパンなど）や、技術書典・BOOTH などで手に入る。

### 読む画面の操作

- 再生 / 停止: 「再生」ボタン、文節の枠のタップ、スペースキー
- 1文戻る / 1文進む: 文の頭へ跳ぶ。文の途中で「1文戻る」を押すと、その文の頭へ戻る
- 位置: スライダーで好きな所へ跳ぶ。右に読了までの残り時間が出る
- 速さ: 300〜1200 文字/分。100 文字ごとに目盛りがある
- 全文を見る: 本文を全部表示する。速読で見ていた文節が黄色くなり、そこまでスクロールする。「速読に戻る」で続きから読める
- 一覧に戻る: 端末の戻る操作でも戻れる

## 速読の仕組み

### 文節の分け方

本文を段落ごとに BudouX で文節に区切る（`src/features/reader/phrases.ts`）。

- 10 文字（`MAX_PHRASE_CHARS`）を超える文節は、なるべく同じ長さになるよう分ける。縦書きの枠（画面の高さの 55%、文字は高さの 5%）に収まる文字数に合わせている
- 分けた後ろ側が「、」「。」「」」などで始まらないよう、切れ目を前にずらす

### 1 文節の表示時間

`src/features/reader/timing.ts` で次のように決める。

1. 文節の文字数を数える。ただし 2 文字（`MIN_CHARS`）より短い文節も 2 文字として扱う（1 文字だけが一瞬で消えて読めないのを避ける）
2. 止まる分を足す。文の終わり（。！？）なら 3 文字分（`SENTENCE_PAUSE` × `MIN_CHARS`）、段落の終わりなら 5 文字分（`PARAGRAPH_PAUSE` × `MIN_CHARS`）
3. 1 文字あたり `60000 ÷ 速さ（文字/分）` ミリ秒を掛ける

初期値の 700 文字/分なら、1 文字あたり約 86ms になる。

| 文節                   | 数える文字数             | 表示時間 |
| ---------------------- | ------------------------ | -------- |
| は                     | 2（最低）                | 約 171ms |
| 吾輩は                 | 3                        | 約 257ms |
| 猫である。             | 5 ＋ 文の終わり 3 ＝ 8   | 約 686ms |
| 無い。（段落の終わり） | 3 ＋ 段落の終わり 5 ＝ 8 | 約 686ms |

### 残り時間

今の文節から最後までの表示時間を足したもの（句点や段落で止まる分も含む）。各文節の「何文字分か」を本を開いた時に一度だけ足し合わせておき、速さで割って出す。

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
│   ├── import/       取り込み（.txt・zip・EPUB の読み込み、青空文庫の書式の整形）
│   ├── reader/       読む画面（文節分割、表示時間、速読表示、全文表示）
│   └── library/      一覧の画面（おすすめ一覧、本棚（予定））
├── storage/          保存処理（予定）。Dexie.js を使う処理はここに集める
└── components/       複数の機能で使う部品（必要になったら作る）
```

※テーマ: 色や文字の大きさなど、アプリ全体の見た目の設定

## 開発

Node.js 22.18 以降（LTS の 24 を推奨）が必要。

画面（直下）と Worker（`worker/`）は npm workspaces でまとめてあり、コマンドは直下で打つ。

```bash
npm install      # 画面と Worker の両方のライブラリを入れる
npm run dev      # 画面（http://localhost:5173/hayayomi/）と Worker（http://localhost:8787）を一緒に起動する
npm run dev:web  # 画面だけを起動する
npm run build    # 公開用のファイルを dist フォルダに作る
npm run lint     # oxlint でコードを検査する
npm run format   # Prettier でコードの書き方を揃える
```

`npm run dev` は concurrently で二つを並べて動かす。ログの頭の `[web]` が画面、`[api]` が Worker。

画面は `.env.development` の `VITE_API_URL`（`http://localhost:8787`）の Worker を使う。`npm run dev:web` の時に公開済みの Worker を使うなら、`.env.development.local` に `VITE_API_URL=公開済みの Worker の URL` を書く（git には入らない）。

### Worker（青空文庫の中継）

Worker だけのコマンドは `-w worker` を付けて直下で打つ（例: `npm run typecheck -w worker`）。入口・設定・URL の仕組み・出し直しの手順は [worker/README.md](worker/README.md) にまとめてある。

### 公開

`main` に push すると GitHub Actions が公開する。

- 画面: `.github/workflows/deploy.yml` が GitHub Pages に公開する
- Worker: `worker/`・`shared/`・`package-lock.json` が変わった時に `.github/workflows/deploy-worker.yml` が Cloudflare に公開する（詳しくは [worker/README.md](worker/README.md#公開出し直し)）

### スマホで確かめる

```bash
npm run dev:web -- --host  # 同じ Wi-Fi の端末から開けるように起動する
```

表示された `Network:` の URL（例: `http://192.168.1.12:5173/`）を、PC と同じ Wi-Fi につないだスマホで開く。

※スマホからは PC の Worker（`localhost:8787`）に届かないため、おすすめ一覧は出ない。ファイル選択での取り込みと表示を確かめる用

開けない時は次を確かめる。

- Windows ファイアウォールで Node.js の通信が許可されているか
- iPhone の場合、設定 →「プライバシーとセキュリティ」→「ローカルネットワーク」で、使っているブラウザが許可されているか
