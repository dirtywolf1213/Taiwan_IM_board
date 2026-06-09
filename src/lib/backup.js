// 進度備份:把 localStorage 的作答紀錄編碼成一段文字(或 .txt 檔),
// 方便換裝置 / 清快取前備份還原。屬本機手動備援,非雲端同步。
//
// 為了縮短備份碼,新版(v2)做三件事:
//   1) 丟掉沒用到的 ts(時間戳);只保留 id / chosen / correct。
//   2) 用精簡字串格式(非 JSON)。
//   3) 以瀏覽器原生 gzip(CompressionStream)壓縮後再 base64。
// 解碼相容舊格式(原始 JSON、舊版 base64-JSON)。

const b64encode = (s) => btoa(unescape(encodeURIComponent(s)))
const b64decode = (s) => decodeURIComponent(escape(atob(s)))

const bytesToB64 = (bytes) => {
  let bin = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH))
  return btoa(bin)
}
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

const hasGzip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

async function gzip(str) {
  const cs = new CompressionStream('gzip')
  const w = cs.writable.getWriter()
  w.write(new TextEncoder().encode(str)); w.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  return bytesToB64(new Uint8Array(buf))
}
async function gunzip(b64) {
  const ds = new DecompressionStream('gzip')
  const w = ds.writable.getWriter()
  w.write(b64ToBytes(b64)); w.close()
  const buf = await new Response(ds.readable).arrayBuffer()
  return new TextDecoder().decode(buf)
}

// 進度 → 精簡字串:`TIM2|<fav,fav,…>|<id,chosen,correct>;…`
function toCompact(progress) {
  const results = progress?.results || {}
  const favorites = Array.isArray(progress?.favorites) ? progress.favorites : []
  const entries = Object.entries(results).map(
    ([id, r]) => `${id},${r?.chosen ?? ''},${r?.correct ? 1 : 0}`,
  )
  return `TIM2|${favorites.join(',')}|${entries.join(';')}`
}
function fromCompact(str) {
  const i1 = str.indexOf('|'); const i2 = str.indexOf('|', i1 + 1)
  const favStr = str.slice(i1 + 1, i2)
  const resStr = str.slice(i2 + 1)
  const favorites = favStr ? favStr.split(',') : []
  const results = {}
  if (resStr) {
    for (const e of resStr.split(';')) {
      const c1 = e.indexOf(','); const c2 = e.lastIndexOf(',')
      const id = e.slice(0, c1)
      const chosen = e.slice(c1 + 1, c2)
      const correct = e.slice(c2 + 1) === '1'
      if (id) results[id] = { chosen: chosen === '' ? null : Number(chosen), correct }
    }
  }
  return { results, favorites }
}

// 進度 → 備份碼(async)。能壓縮就壓縮(前綴 TIMZ:),否則退回精簡字串的 base64(前綴 TIMC:)。
export async function encodeProgress(progress) {
  const compact = toCompact(progress)
  if (hasGzip) {
    try { return 'TIMZ:' + (await gzip(compact)) } catch { /* 退回未壓縮 */ }
  }
  return 'TIMC:' + b64encode(compact)
}

// 備份碼 / 原始 JSON → 進度物件(async,寬鬆解析,相容新舊格式)
export async function decodeProgress(text) {
  const t = (text || '').trim()
  if (!t) throw new Error('內容是空的')
  try {
    if (t.startsWith('TIMZ:')) return fromCompact(await gunzip(t.slice(5)))
    if (t.startsWith('TIMC:')) return fromCompact(b64decode(t.slice(5)))
    if (t.startsWith('TIM2|')) return fromCompact(t) // 未編碼的精簡字串
    // 舊格式:原始 JSON 或 base64(JSON)
    const json = t.startsWith('{') ? t : b64decode(t)
    const obj = JSON.parse(json)
    const p = obj && obj.progress ? obj.progress : obj
    if (!p || typeof p !== 'object' || typeof p.results !== 'object' || p.results === null) {
      throw new Error('備份內容不是有效的進度資料')
    }
    return {
      results: p.results || {},
      favorites: Array.isArray(p.favorites) ? p.favorites : [],
    }
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
