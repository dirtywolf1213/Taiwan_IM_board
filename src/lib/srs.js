// 間隔複習(Leitner-lite)。答對升一盒、答錯回第一盒;盒子越高,下次到期越久。
const DAY = 86400000
const INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 16, 5: 35 } // 天

// 由上一次的 srs 狀態 + 本次對錯 → 新狀態
export function nextSrs(prev, correct, now = Date.now()) {
  const box = correct ? Math.min((prev?.box || 0) + 1, 5) : 1
  return { box, due: now + INTERVALS[box] * DAY }
}

// 已到期(due <= now)的題目 id
export function dueIds(srs, now = Date.now()) {
  return Object.entries(srs || {})
    .filter(([, v]) => v && typeof v.due === 'number' && v.due <= now)
    .map(([id]) => id)
}

export const dueCount = (srs, now = Date.now()) => dueIds(srs, now).length
