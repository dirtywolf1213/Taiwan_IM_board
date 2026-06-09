// 深色模式:存在 localStorage,套在 <html data-theme>。
const KEY = 'tim_theme'

export function getTheme() {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}
export function applyTheme(t) {
  document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light'
}
export function setTheme(t) {
  try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  applyTheme(t)
}
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
