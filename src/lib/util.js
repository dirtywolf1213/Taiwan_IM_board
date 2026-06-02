export const SUBJECT_ORDER = [
  '心臟血管', '胸腔', '消化', '新陳代謝與內分泌', '腎臟',
  '風濕免疫及過敏', '血液腫瘤', '感染', '神經', '精神', '皮膚',
]

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const letter = (i) => String.fromCharCode(65 + i)

export function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
