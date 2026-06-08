import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// 部署到子路徑時(例如 GitHub Pages)可用 BASE_PATH 覆寫
const base = process.env.BASE_PATH || '/'

// 版本資訊:版本號以 changelog 第一筆為單一真實來源;另記錄 build 時間與 git commit。
const changelog = JSON.parse(readFileSync('./src/data/changelog.json', 'utf8'))
const version = changelog[0]?.version || '0.0.0'
let gitSha = 'dev'
try { gitSha = execSync('git rev-parse --short HEAD').toString().trim() } catch { /* 無 git 時忽略 */ }

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_SHA__: JSON.stringify(gitSha),
  },
  plugins: [
    react(),
    VitePWA({
      // 提示式更新:偵測到新版只跳通知,由使用者按下才套用(不再背景強制換版)
      registerType: 'prompt',
      injectRegister: false, // 改由 src 內的 useRegisterSW 自行註冊,避免重複註冊
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // 不再 skipWaiting:新版會等待,直到使用者按「更新」才接管(對應提示式更新)
        // 圖片不進預快取,改為 runtime CacheFirst(穩定、可離線、不阻塞首屏)
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tim-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      manifest: {
        name: '內科專科考試刷題',
        short_name: '內科刷題',
        description: '台灣內科專科醫師甄審刷題練習',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        lang: 'zh-Hant',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
