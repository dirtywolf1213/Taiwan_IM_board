export const SUBJECT_ORDER = [
  '心臟血管', '胸腔', '消化', '新陳代謝與內分泌', '腎臟',
  '風濕免疫及過敏', '血液腫瘤', '感染', '神經', '精神', '皮膚',
]

// 各科專屬顏色(盡量互相區隔)
export const SUBJECT_COLORS = {
  心臟血管: '#dc2626',        // 紅
  胸腔: '#0284c7',           // 藍
  消化: '#ea580c',           // 橘
  新陳代謝與內分泌: '#7c3aed',  // 紫
  腎臟: '#0d9488',           // 青
  風濕免疫及過敏: '#db2777',    // 粉
  血液腫瘤: '#4f46e5',        // 靛
  感染: '#16a34a',           // 綠
  神經: '#ca8a04',           // 金
  精神: '#0891b2',           // 天青
  皮膚: '#b45309',           // 棕
}

export const subjectColor = (s) => SUBJECT_COLORS[s] || '#64748b'

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const letter = (i) => String.fromCharCode(65 + i)

// 預先載入圖片(讓下一題的附圖先進瀏覽器快取)
export function preloadImage(image) {
  if (!image) return
  const im = new Image()
  im.src = import.meta.env.BASE_URL + image
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
