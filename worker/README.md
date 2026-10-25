# Worker（青空文庫と記事の中継）

青空文庫や Zenn・note は、ほかのサイトから直接読み込むこと（CORS）を許していない。そのため、Cloudflare Workers 上のこの小さなプログラムが、ブラウザの代わりに取ってきて返す。Qiita は CORS を許しているが、サイトごとに分けて考えずに済むよう、同じく Worker を通す。

公開先: https://api.nagiurrrr.workers.dev

## 入口

| パス                                | 返すもの                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /ranking`                      | 最新の年間アクセスランキング（テキスト版）の上位 100 作品（JSON。形は `shared/api.ts` の `Ranking`） |
| `GET /books/{人物ID}/{作品ID}/text` | その作品の「テキストファイル(ルビあり)」の zip                                                       |
| `GET /articles/{サイト}/{記事ID}`   | 記事の JSON（各サイトの API が返したもの）。サイトは `zenn`・`qiita`・`note`                         |

## ファイル

```
worker/
├── wrangler.jsonc              Worker の設定
├── worker-configuration.d.ts   wrangler.jsonc から作る型（npm run types -w worker）。手で書き換えない
└── src/
    ├── index.ts                入口。CORS、KV への保存、zip と記事の中継
    ├── aozora.ts               ランキング・図書カードのページの読み取り
    └── articles.ts             記事を取りに行くサイトの API
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
| `kv_namespaces`        | ランキングと記事を置く KV（`CACHE`）                  |
| `ratelimits`           | 同じ IP から 1 分に呼べる回数（`RATE_LIMITER`）       |

### ALLOWED_ORIGINS

- Origin は `https://nagiurrrr.github.io` のように、スキーム・ホスト・ポートだけを書く。パス（`/hayayomi/`）は含めない。ブラウザが送る `Origin` ヘッダーにパスは入らないため
- `http://localhost:5173` を入れてあるのは、手元の開発用サーバーから公開済みの Worker を使えるようにするため。localhost は、それぞれの人の手元の PC を指すだけなので、他人のサイトに読み取りを許すことにはならない
- 許していない Origin や、Origin の無い呼び出し（curl など）には 403 を返す。ただし Origin は偽れるので、秘密の情報は返さない

### ratelimits

- 同じ IP（`CF-Connecting-IP`）から 1 分に 60 回を超えて呼ばれたら、429 を返す。無料枠（1 日 10 万リクエスト）や、Qiita の 1 時間 60 回の上限を、繰り返しの呼び出しで使い切られないようにするため
- 数えるのは Cloudflare の拠点ごとで、厳密ではない。`namespace_id` はアカウントの中で制限を見分ける番号で、秘密ではない

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

## 記事の中継

1. 画面が、記事の URL からサイトと記事の ID を取り出し、`GET /articles/{サイト}/{記事ID}` を呼ぶ
2. Worker が `src/articles.ts` に書いた API の URL を組み立てて取りに行く。それ以外の URL へは取りに行かない（何でも中継すると踏み台になるため）
3. 取った JSON を KV に 1 日置き、そのまま返す。Qiita の認証なしの API は、同じ IP から 1 時間に 60 回までしか呼べない。Worker から取りに行く IP はほかの Worker と共有なので、KV で呼ぶ回数を減らす
4. 画面が JSON の本文の HTML から文字を取り出す

| サイト | 取りに行く先                              | 備考                                   |
| ------ | ----------------------------------------- | -------------------------------------- |
| Zenn   | `https://zenn.dev/api/articles/{slug}`    | 非公式。黙って変わることがある         |
| Qiita  | `https://qiita.com/api/v2/items/{記事ID}` | 公式                                   |
| note   | `https://note.com/api/v3/notes/{キー}`    | 非公式。有料記事は無料の部分だけが入る |

- サイトを増やす時は、`shared/api.ts` の `ARTICLE_SITES` と `src/articles.ts` に足し、画面の `src/features/import/article.ts` に URL の形と JSON の読み方を足す
- Qiita の上限に当たるようになったら、Qiita のアクセストークンを Worker の秘密の値（`wrangler secret put`）に置いて付ける（1 時間 1000 回になる）

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
  - 手元のコードがそのまま本番を上書きする。`main` に後から入った変更（守りの設定など）が手元に無いと、それが本番から消える。Actions が使えない時だけにし、`git pull` で `origin/main` と同じにしてから行う

### URL を変える時

1. `wrangler.jsonc` の `name` を変える（またはダッシュボードでアカウントのサブドメインを変える）
2. 公開する
3. `.env.production` の `VITE_API_URL` を新しい URL にする
4. `vite.config.ts` のサービスワーカーの設定は `VITE_API_URL` から作るので、書き換えは要らない
5. 画面を公開し直す（`main` に push）
6. 古い Worker が要らなければ、ダッシュボードから消す
