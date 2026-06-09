// 進度備份:把 localStorage 的作答紀錄編碼成一段文字(或 .txt 檔),
// 方便換裝置 / 清快取前備份還原。屬本機手動備援,非雲端同步。
//
// 格式:精簡 JSON(短鍵 r/f/n/s)→ gzip 壓縮 → base64,前綴 "TIMG:"。
//   r: { id: [chosen, correct01] }（不存沒用到的時間戳)
//   f: [favorites]   n: { id: note }   s: { id: {box,due} }
// 解碼相容所有舊格式(TIMZ/TIMC 精簡字串、原始 JSON、舊 base64-JSON)。

const b64encode = (s) => btoa(unescape(encodeURIComponent(s)))
const b64decode = (s) => decodeURIComponent(escape(atob(s)))

const bytesToB64 = (bytes) => {
  let bin = ''; const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH))
  return btoa(bin)
}
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const hasGzip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

async function gzip(str) {
  const cs = new CompressionStream('gzip')
  const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close()
  return bytesToB64(new Uint8Array(await new Response(cs.readable).arrayBuffer()))
}
async function gunzip(b64) {
  const ds = new DecompressionStream('gzip')
  const w = ds.writable.getWriter(); w.write(b64ToBytes(b64)); w.close()
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer())
}

// 進度 → 精簡物件(短鍵)
function toObj(p) {
  const r = {}
  for (const [id, v] of Object.entries(p?.results || {})) r[id] = [v?.chosen ?? -1, v?.correct ? 1 : 0]
  const n = {}
  for (const [id, t] of Object.entries(p?.notes || {})) if (t && String(t).trim()) n[id] = t
  return { r, f: Array.isArray(p?.favorites) ? p.favorites : [], n, s: p?.srs || {} }
}
function fromObj(o) {
  const results = {}
  for (const [id, a] of Object.entries(o.r || {})) {
    const ch = Array.isArray(a) ? a[0] : a?.chosen
    const co = Array.isArray(a) ? a[1] : a?.correct
    results[id] = { chosen: (ch == null || ch < 0) ? null : Number(ch), correct: co === 1 || co === true }
  }
  return {
    results,
    favorites: Array.isArray(o.f) ? o.f : [],
    notes: (o.n && typeof o.n === 'object') ? o.n : {},
    srs: (o.s && typeof o.s === 'object') ? o.s : {},
  }
}

// 舊格式 / 寬鬆物件 → 標準進度
function normalizeLoose(p) {
  if (!p || typeof p !== 'object' || typeof p.results !== 'object' || p.results === null) {
    throw new Error('備份內容不是有效的進度資料')
  }
  return {
    results: p.results || {},
    favorites: Array.isArray(p.favorites) ? p.favorites : [],
    notes: (p.notes && typeof p.notes === 'object') ? p.notes : {},
    srs: (p.srs && typeof p.srs === 'object') ? p.srs : {},
  }
}

// 舊版精簡字串 `TIM2|favs|id,chosen,correct;…`
function fromCompact(str) {
  const i1 = str.indexOf('|'); const i2 = str.indexOf('|', i1 + 1)
  const favStr = str.slice(i1 + 1, i2); const resStr = str.slice(i2 + 1)
  const favorites = favStr ? favStr.split(',') : []
  const results = {}
  if (resStr) for (const e of resStr.split(';')) {
    const c1 = e.indexOf(','); const c2 = e.lastIndexOf(',')
    const id = e.slice(0, c1)
    if (id) results[id] = { chosen: e.slice(c1 + 1, c2) === '' ? null : Number(e.slice(c1 + 1, c2)), correct: e.slice(c2 + 1) === '1' }
  }
  return { results, favorites, notes: {}, srs: {} }
}

// 進度 → 備份碼(async)。能壓縮就 TIMG:(gzip JSON),否則退回 TIMJ:(base64 JSON)。
export async function encodeProgress(progress) {
  const json = JSON.stringify(toObj(progress))
  if (hasGzip) { try { return 'TIMG:' + (await gzip(json)) } catch { /* fallthrough */ } }
  return 'TIMJ:' + b64encode(json)
}

// 備份碼 / 原始 JSON → 進度物件(async,相容新舊格式)
export async function decodeProgress(text) {
  const t = (text || '').trim()
  if (!t) throw new Error('內容是空的')
  try {
    if (t.startsWith('TIMG:')) return fromObj(JSON.parse(await gunzip(t.slice(5))))
    if (t.startsWith('TIMJ:')) return fromObj(JSON.parse(b64decode(t.slice(5))))
    if (t.startsWith('TIMZ:')) { // 舊:gzip 的精簡字串
      const s = await gunzip(t.slice(5))
      return s.startsWith('TIM2|') ? fromCompact(s) : fromObj(JSON.parse(s))
    }
    if (t.startsWith('TIMC:')) return fromCompact(b64decode(t.slice(5)))
    if (t.startsWith('TIM2|')) return fromCompact(t)
    const json = t.startsWith('{') ? t : b64decode(t)
    const obj = JSON.parse(json)
    if (obj && obj.r && typeof obj.r === 'object' && !obj.results) return fromObj(obj)
    return normalizeLoose(obj && obj.progress ? obj.progress : obj)
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error('備份內容不是有效的 JSON')
    if (e.message && e.message.includes('進度')) throw e
    throw new Error('備份碼格式無法解析')
  }
}

export const countAnswered = (progress) => Object.keys(progress?.results || {}).length

// 直接下載目前進度備份檔(供「更新前先匯出」等情境快速使用)
export async function downloadBackup(progress) {
  const code = await encodeProgress(progress)
  const blob = new Blob([code], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `內科刷題進度_${new Date().toISOString().slice(0, 10)}.txt`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return code
}
