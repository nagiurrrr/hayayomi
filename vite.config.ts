import { minimal2023Preset } from '@vite-pwa/assets-generator/config'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
      },
    }),
  ],
})
