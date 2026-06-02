// 進度備份:把 localStorage 的作答紀錄編碼成一段文字(或 .json 檔),
// 方便換裝置 / 清快取前備份還原。屬本機手動備援,非雲端同步。

const b64encode = (s) => btoa(unescape(encodeURIComponent(s)))
const b64decode = (s) => decodeURIComponent(escape(atob(s)))

// 進度 → 備份碼(含版本與時間,base64)
export function encodeProgress(progress) {
  const payload = {
    app: 'tim',
    v: 1,
    exportedAt: new Date().toISOString(),
    progress,
  }
  return b64encode(JSON.stringify(payload))
}

// 備份碼或原始 JSON → 進度物件(寬鬆解析,並驗證基本結構)
export function decodeProgress(text) {
  const t = (text || '').trim()
  if (!t) throw new Error('內容是空的')
  let json
  try {
    json = t.startsWith('{') ? t : b64decode(t)
  } catch {
    throw new Error('備份碼格式無法解析')
  }
  let obj
  try {
    obj = JSON.parse(json)
  } catch {
    throw new Error('備份內容不是有效的 JSON')
  }
  const p = obj && obj.progress ? obj.progress : obj
  if (!p || typeof p !== 'object' || typeof p.results !== 'object' || p.results === null) {
    throw new Error('備份內容不是有效的進度資料')
  }
  return {
    results: p.results || {},
    favorites: Array.isArray(p.favorites) ? p.favorites : [],
  }
}

export const countAnswered = (progress) => Object.keys(progress?.results || {}).length
