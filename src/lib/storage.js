// 作答進度存在瀏覽器 localStorage,各裝置各自保存、互不干擾。
const KEY = 'tim_progress_v1'

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    return { ...defaults(), ...JSON.parse(raw) }
  } catch {
    return defaults()
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* 容量滿或隱私模式時忽略 */
  }
}

function defaults() {
  // results: { [id]: { chosen, correct, ts } } — 每題最近一次作答
  // favorites: [id]
  return { results: {}, favorites: [] }
}
