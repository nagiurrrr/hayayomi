# Hayayomi

## 概要
青空文庫などのテキストを読み込み、フラッシュ暗算のように文節を一つずつ表示する速読PWA（RSVP方式）。スマホ主体、PCブラウザでも使う。

## 方針
- バックエンドなし。すべてブラウザ内で処理する
  - 同期やアカウントが必要になったら Supabase / Firebase を足す。保存処理は一か所にまとめて差し替えやすくしておく
- Vite + React + TypeScript
- vite-plugin-pwa / BudouX（文節分割）/ Dexie.js（IndexedDB）/ fflate（zip展開）
- 分割は単語ではなく文節単位（BudouX）。kuromoji.js は辞書が重いので使わない
- APK化する場合は Capacitor を使う（distを同梱するのでサーバー不要・オフライン動作）。TWA は公開サーバーが必要なので使わない

## 青空文庫の扱い
- Shift_JIS は `new TextDecoder('shift_jis')` で読む
- ルビ（《》、｜）、注記（［＃…］）、末尾の底本情報は除去する
- 直接取得は CORS に阻まれる可能性があるため、最初はファイル選択で取り込む

## 進め方
- まずは「テキスト貼り付け → 文節分割 → 指定速度で表示」の最小構成から作る
- 取り込み（ファイル・zip）や本棚はその後
