import { minimal2023Preset } from '@vite-pwa/assets-generator/config'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 青空文庫の中継（worker/）の URL。サービスワーカーでの保存の対象を決めるのに使う
  const { VITE_API_URL } = loadEnv(mode, process.cwd())
  if (!VITE_API_URL) {
    throw new Error(`VITE_API_URL が未設定です（.env.${mode} に書く）`)
  }
  const apiUrl = RegExp.escape(VITE_API_URL)

  return {
    // GitHub Pages では https://nagiurrrr.github.io/hayayomi/ に置かれる
    base: '/hayayomi/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // favicon.svg からアイコン一式を作り、マニフェストと index.html に差し込む
        pwaAssets: {
          image: 'public/favicon.svg',
          preset: {
            ...minimal2023Preset,
            // Android で丸く切り抜かれても白い余白が出ないよう、背景をテーマ色で塗る
            maskable: {
              ...minimal2023Preset.maskable,
              resizeOptions: { background: '#1976d2' },
            },
          },
        },
        manifest: {
          name: 'Hayayomi',
          short_name: 'Hayayomi',
          description: '文節を一つずつ表示する速読アプリ',
          lang: 'ja',
          display: 'standalone',
          theme_color: '#1976d2',
          background_color: '#ffffff',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          runtimeCaching: [
            // おすすめ一覧は最新を取りに行き、オフラインなら前回の結果を出す
            {
              urlPattern: new RegExp(`^${apiUrl}/ranking$`),
              handler: 'NetworkFirst',
              options: { cacheName: 'ranking' },
            },
            // 作品の zip はほぼ変わらないので、一度取ったものを使い回す
            {
              urlPattern: new RegExp(`^${apiUrl}/books/`),
              handler: 'CacheFirst',
              options: {
                cacheName: 'book-text',
                expiration: { maxEntries: 50 },
              },
            },
          ],
        },
      }),
    ],
  }
})
