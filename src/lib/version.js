/* global __APP_VERSION__, __BUILD_TIME__, __GIT_SHA__ */
// 由 vite.config.js 的 define 在 build 時注入。
import changelog from '../data/changelog.json'

export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = __BUILD_TIME__
export const GIT_SHA = __GIT_SHA__
export const CHANGELOG = changelog

const SEEN_KEY = 'tim_seen_version'

// 是否有「自上次檢視以來」的新版本(用於首頁紅點提示)
export function hasUnseenUpdate() {
  try { return localStorage.getItem(SEEN_KEY) !== APP_VERSION } catch { return false }
}
export function markVersionSeen() {
  try { localStorage.setItem(SEEN_KEY, APP_VERSION) } catch { /* ignore */ }
}

// 一鍵刷新最新版:清掉所有快取後重新載入(保底用,確保拿到最新檔案)
export async function forceRefresh() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch { /* ignore */ }
  // 加上時間戳記避免任何中間層快取
  const url = new URL(window.location.href)
  url.searchParams.set('_v', Date.now().toString())
  window.location.replace(url.toString())
}
