# Hayayomi

## 概要

青空文庫などのテキストを読み込み、フラッシュ暗算のように文節を一つずつ表示する速読PWA（RSVP方式）。スマホ主体、PCブラウザでも使う。

## 方針

- ユーザーのデータはブラウザ内だけに置く。取り込み・整形・表示もブラウザ内で処理する
  - 同期やアカウントが必要になったら Supabase / Firebase を足す。保存処理は一か所にまとめて差し替えやすくしておく
- サーバー側は、青空文庫・記事のサイト（Zenn・Qiita・note）・任意の Web ページの中継だけを Cloudflare Workers（`worker/`）に置く。どれも CORS を許可していないことがあるため
  - 外のサイトから取るものは、CORS を許可しているサイトでも Worker を通す。サイトごとにどちらにするか考えずに済むように
  - 無料枠（1 日 10 万リクエスト、1 リクエストあたり CPU 10ms、KV の書き込みは 1 日 1,000 回）に収める。重い処理（作品一覧 CSV の展開・HTML からの本文の取り出しなど）は Worker でしない
  - 読み取りを許す Origin は GitHub Pages と開発用サーバーに限る。ただし Origin は偽れるので、これだけでは踏み台を防げない
  - 任意の Web ページの中継（`/page`）は踏み台にされやすいので、次の制限を必ず守る
    - https だけを通し、IP アドレス直打ち・localhost・既定以外のポートは弾く（転送された先も同じく調べる）
    - Content-Type が text/html のものだけを通し、大きさに上限を設ける
    - 同じ IP からの回数は、Worker 全体の Rate Limiting（1 分に 60 回）で絞る
    - KV には置かない（書き込みの上限がすぐ尽きるのと、他人のページを溜めて配り直さないため）
- Vite + React + TypeScript。Worker も TypeScript で書く（wrangler）
- vite-plugin-pwa / BudouX（文節分割）/ Dexie.js（IndexedDB）/ fflate（zip展開）/ MUI（UI部品）/ react-router（画面遷移）
- 画面の切り替えは HashRouter を使う。GitHub Pages は知らないパスを index.html に回せないため
- 分割は単語ではなく文節単位（BudouX）。kuromoji.js は辞書が重いので使わない

## スタイル

- 文字列はダブルクォート、文末にセミコロンを付ける（Prettier の既定に合わせる）
- UI は MUI。スタイルは `sx` で tsx に書き、CSS ファイルは作らない
- 文節を高速で切り替える表示部分では `sx` の値を毎回変えない（emotion がスタイルを計算し直す負担を避けるため）

## ディレクトリ構成

- 機能ごとに分ける（`src/features/import`・`src/features/reader`・`src/features/library`）。アトミックデザインは採らない
- 機能をまたいで使うものだけ `src/components/`（部品）・`src/lib/`（汎用処理）に出す
- 保存処理（Dexie）は `src/storage/` に集める
- ロジック（.ts）と画面（.tsx）を分ける。テストは対象の隣に `*.test.ts` で置く
- 画面と Worker の両方が使う型は `shared/` に置く
- まだ使わないフォルダは、必要になってから作る

## 青空文庫の扱い

- 取り込むのは「テキストファイル(ルビあり)」の zip。中の .txt を fflate で取り出す（展開済みの .txt も受け付ける）
- 文字コードは、UTF-8 として読めなければ Shift_JIS とみなし `new TextDecoder('shift_jis')` で読む
- 冒頭の記号説明（-------で囲まれた部分）、ルビ（《》、｜）、注記（［＃…］）、末尾の底本情報は除去する
- 外字注記（※［＃…］）は当面「〓」に置き換える（本来の文字に戻すのは #14）
- ブラウザからの直接取得は CORS に阻まれるため、Worker を通して取得する。ファイル選択での取り込みも残す
- おすすめ一覧は、アクセスランキングの目次から一番新しい年間ランキング（テキスト版）を選び、上位 100 件を出す
  - Worker はランキングの結果を KV に 1 日置く。作品の zip は図書カードのページから探し、中身を読まずにそのまま流す

## EPUB の扱い

- DRM の無い EPUB だけを読む。本文が暗号化されたもの（META-INF/encryption.xml に本文のページが載っているもの）は、読み込まずに知らせる
- spine の順に XHTML から本文を取り出す。ルビの読み（rt / rp）は外し、目次などの付録（linear="no"）と画像は飛ばす

## 記事の扱い

- Zenn・Qiita・note の記事を、URL から読む。各サイトの API が返す JSON を Worker が KV に 1 日置き、そのまま返す
  - Qiita は公式 API。認証なしでは同じ IP から 1 時間に 60 回までなので、KV で節約する
  - Zenn・note の API は非公式で、黙って変わることがある
- 本文の HTML からの文字の取り出しは、EPUB と同じ `src/features/import/html.ts` を使う
- コードブロック（pre）は、速読では「（コード省略）」の 1 文節にし、全文表示でだけ中身を出す
- 画像・数式・埋め込みは飛ばす。見出しは段落の終わりとして扱う
- note の有料記事は、無料の部分だけを読む
- それ以外のサイトの URL は、Worker がページの HTML をそのまま返し、画面で本文を取り出す
  - 本文は article・main を優先し、無ければ body から nav・aside・footer などを除いて取る
  - 文字コードは Content-Type か meta の charset に従う（Shift_JIS・EUC-JP の古いサイトもあるため）
  - 読めないとき（JS で中身を作るページ・HTML でないもの・大きすぎるものなど）は、理由をスナックバーで知らせる。文言は `src/features/import/web.ts` の定数にまとめる

## 攻撃への備え（#16）

- 取り込んだ HTML はそのまま描かず、文字だけを取り出して React で出す。`dangerouslySetInnerHTML` は使わない
- zip と EPUB は、展開した後の大きさが 100MB を超えたら読まない（`src/features/import/unzip.ts`）。EPUB の画像などは展開しない
- ビルドした画面には、CSP を meta で入れる（`vite.config.ts`）。読み込む先は自分と Worker だけ
- Worker は、許した Origin 以外からの呼び出しを断り、同じ IP からの回数を 1 分に 60 回までにする
- 依存パッケージの更新は Dependabot が月に一度 PR にする。小さな更新はまとめ、大きな更新（major）は 1 つずつ別の PR になるので、試してから入れる

## 本棚の扱い

- 開いたものは自動で本棚に入れる。同じものは、青空文庫は人物 ID と作品 ID、記事はサイトと記事 ID、それ以外の Web ページは URL（# 以降を除く）、手元のファイルは題名・著者・本文の長さで見分ける
- IndexedDB の表は、一覧用（`books`）と本文用（`bodies`）に分ける。本棚を出す時に全冊の本文を読まずに済むように
- 読んだ位置は、何番目の文節かではなく本文の何文字目か（文節の start）で持つ。文節の分け方を変えても同じ所から読めるように
- 読む画面の URL は `#/read/{本棚の ID}`。本文は本棚から読む

## 進め方

- ファイル取り込み（.txt / .zip / .epub）と全文表示はできた
- おすすめ一覧（Worker 経由でランキングを取得し、「読む」で直接取り込む）はできた
- 文節分割と速読表示（縦書き・速さの指定・全文表示との行き来・残り時間）はできた
- Zenn・Qiita・note の記事を URL から読めるようにした
- 本棚（下のタブでホームと切り替え、開いたものを自動で保存、読んだ位置と速さを覚える）はできた
- しおり（#11）は、本棚で続きから読めるようになったので済んだ
- 次は Android の共有メニューから記事を速読できるようにする（#13）
- その次にテストを入れ、文節分割・本文の取り出し・保存処理などを広く守る（#6）
- そのほかの予定は GitHub issue で管理する

## 公開

- 画面も Worker も、`main` への push で GitHub Actions が公開する（`.github/workflows/deploy.yml`・`deploy-worker.yml`）。「デプロイして」と言われたら push のことで、`npm run deploy -w worker` は手元から実行しない
  - 手元から公開すると、手元のコードがそのまま本番を上書きし、`main` に後から入った変更が本番から消えるため
- push の前に `git fetch` し、`origin/main` に新しいコミットがあれば先に取り込む（Dependabot やクラウドのセッションが `main` に入れることがある）
- 詳しい手順は `worker/README.md` の「公開（出し直し）」

## Issue

- 作業中にユーザーが別件のアイデアや要望を言ったら、勝手に着手せず `/issue` の手順で GitHub issue にして、今のタスクを続ける
- issue を作ったら URL を一言で報告する
