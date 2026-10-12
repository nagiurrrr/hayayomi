# Worker（青空文庫の中継）

青空文庫は、ほかのサイトから直接読み込むこと（CORS）を許していない。そのため、Cloudflare Workers 上のこの小さなプログラムが、ブラウザの代わりに青空文庫から取ってきて返す。

公開先: https://api.hayayomi.workers.dev

## 入口

| パス                                | 返すもの                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /ranking`                      | 最新の年間アクセスランキング（テキスト版）の上位 100 作品（JSON。形は `shared/api.ts` の `Ranking`） |
| `GET /books/{人物ID}/{作品ID}/text` | その作品の「テキストファイル(ルビあり)」の zip                                                       |

## ファイル

```
worker/
├── wrangler.jsonc              Worker の設定
├── worker-configuration.d.ts   wrangler.jsonc から作る型（npm run types -w worker）。手で書き換えない
└── src/
    ├── index.ts                入口。CORS、KV への保存、zip の中継
    └── aozora.ts               ランキング・図書カードのページの読み取り
```

## URL の仕組み

Worker の URL は `<Worker の名前>.<アカウントのサブドメイン>.workers.dev` になる。

- Worker の名前: `wrangler.jsonc` の `name`（`api`）
- アカウントのサブドメイン: Cloudflare のダッシュボードで決める（`hayayomi`）

画面には、ビルドの時に `.env.production` の `VITE_API_URL` が埋め込まれる。開発中は `.env.development` の `http://localhost:8787`（`npm run dev` で動く Worker）を使う。

## wrangler.jsonc の各項目

| 項目                   | 意味                                                  |
| ---------------------- | ----------------------------------------------------- |
| `name`                 | Worker の名前。URL の頭になる                         |
| `main`                 | 入口のファイル                                        |
| `compatibility_date`   | どの時点の Workers の動きに合わせるか                 |
| `observability`        | Cloudflare のダッシュボードでログを見られるようにする |
| `vars.ALLOWED_ORIGINS` | 読み取りを許す Origin の一覧                          |
| `kv_namespaces`        | ランキングの結果を置く KV（`CACHE`）                  |

### ALLOWED_ORIGINS

- Origin は `https://nagiurrrr.github.io` のように、スキーム・ホスト・ポートだけを書く。パス（`/hayayomi/`）は含めない。ブラウザが送る `Origin` ヘッダーにパスは入らないため
- `http://localhost:5173` を入れてあるのは、手元の開発用サーバーから公開済みの Worker を使えるようにするため。localhost は、それぞれの人の手元の PC を指すだけなので、他人のサイトに読み取りを許すことにはならない
- 許していない Origin からの読み取りは、ブラウザが止める。Worker 自体は誰でも呼べるので、秘密の情報は返さない

### KV の ID

`kv_namespaces` の `id` は、KV の置き場所を指す名前にすぎず、秘密ではない。KV を読み書きするには Cloudflare の API トークンが要る。

## 「読む」を押してから表示されるまで

1. 画面が `GET /books/{人物ID}/{作品ID}/text` を呼ぶ
2. Worker が図書カードのページを取り、「テキストファイル(ルビあり)」の zip の場所を探す（無ければほかのテキストの zip）
3. Worker が zip を取り、中身を読まずにそのまま流す。CPU の時間をほぼ使わないので、無料枠（1 リクエストあたり CPU 10ms）に収まる
4. 画面が zip をメモリで受け取り、ファイル選択と同じ `importBytes` で取り込む

- zip はダウンロードフォルダには保存されない。ページを閉じると本文は消える（本棚ができるまで）
- ただし、zip には `Cache-Control: max-age=604800`（1 週間）を付けており、サービスワーカーも最大 50 作品まで保存するため、同じ作品を開き直す時は通信せずに済む
- ランキングは作るたびに青空文庫のページを 2 つ読むので、結果を KV に 1 日置く。ブラウザにも 1 日置かせる

## 開発

コマンドはリポジトリの直下で打つ。

```bash
npm run dev                  # 画面と Worker を一緒に起動する（Worker は http://localhost:8787）
npm run typecheck -w worker  # 型チェック
npm run types -w worker      # wrangler.jsonc を変えたら、型（worker-configuration.d.ts）を作り直す
```

## 公開（出し直し）

- **GitHub Actions**: `worker/`・`shared/`・`package-lock.json` が変わった `main` への push で、`.github/workflows/deploy-worker.yml` が公開する。手で動かすなら、GitHub の Actions から「Deploy Worker」を「Run workflow」する
  - GitHub の Secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` が要る。API トークンは Cloudflare のダッシュボードの「API トークン」から、テンプレート「Cloudflare Workers を編集する」で作る
- **手元から**: `npx wrangler login` の後に `npm run deploy -w worker`

### URL を変える時

1. `wrangler.jsonc` の `name` を変える（またはダッシュボードでアカウントのサブドメインを変える）
2. 公開する
3. `.env.production` の `VITE_API_URL` を新しい URL にする
4. `vite.config.ts` のサービスワーカーの設定は `VITE_API_URL` から作るので、書き換えは要らない
5. 画面を公開し直す（`main` に push）
6. 古い Worker が要らなければ、ダッシュボードから消す
