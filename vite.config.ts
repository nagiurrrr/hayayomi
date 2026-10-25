import { minimal2023Preset } from "@vite-pwa/assets-generator/config";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 青空文庫の中継（worker/）の URL。サービスワーカーでの保存の対象を決めるのに使う
  const { VITE_API_URL } = loadEnv(mode, process.cwd());
  if (!VITE_API_URL) {
    throw new Error(`VITE_API_URL が未設定です（.env.${mode} に書く）`);
  }
  const apiUrl = RegExp.escape(VITE_API_URL);

  // 読み込む先を自分と Worker だけに絞る。GitHub Pages ではヘッダーを足せないので meta で書く。
  // style の 'unsafe-inline' は、MUI（emotion）が style 要素を差し込むため
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src 'self' ${new URL(VITE_API_URL).origin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  // 開発用サーバーは、React の差し替え（HMR）のためにインラインの script を使うので、ビルドの時だけ入れる
  const cspPlugin: Plugin = {
    name: "csp",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: csp },
        injectTo: "head-prepend",
      },
    ],
  };

  return {
    // GitHub Pages では https://nagiurrrr.github.io/hayayomi/ に置かれる
    base: "/hayayomi/",
    plugins: [
      react(),
      cspPlugin,
      VitePWA({
        registerType: "autoUpdate",
        // favicon.svg からアイコン一式を作り、マニフェストと index.html に差し込む
        pwaAssets: {
          image: "public/favicon.svg",
          preset: {
            ...minimal2023Preset,
            // Android で丸く切り抜かれても白い余白が出ないよう、背景をテーマ色で塗る
            maskable: {
              ...minimal2023Preset.maskable,
              resizeOptions: { background: "#1976d2" },
            },
          },
        },
        manifest: {
          name: "Hayayomi",
          short_name: "Hayayomi",
          description: "文節を一つずつ表示する速読アプリ",
          lang: "ja",
          display: "standalone",
          theme_color: "#1976d2",
          background_color: "#ffffff",
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
          runtimeCaching: [
            // おすすめ一覧は最新を取りに行き、オフラインなら前回の結果を出す
            {
              urlPattern: new RegExp(`^${apiUrl}/ranking$`),
              handler: "NetworkFirst",
              options: { cacheName: "ranking" },
            },
            // 作品の zip はほぼ変わらないので、一度取ったものを使い回す
            {
              urlPattern: new RegExp(`^${apiUrl}/books/`),
              handler: "CacheFirst",
              options: {
                cacheName: "book-text",
                expiration: { maxEntries: 50 },
              },
            },
            // 和文フォントは文字の範囲ごとに分かれていて全部は要らないので、事前には取らず表示に使ったものだけ取っておく
            {
              urlPattern: /\/assets\/noto-sans-jp-.*\.woff2$/,
              handler: "CacheFirst",
              options: { cacheName: "font" },
            },
          ],
        },
      }),
    ],
  };
});
