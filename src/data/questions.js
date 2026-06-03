// 自動載入所有 questions.<年>.json,之後新增年份只要把檔案放進此資料夾即可。
const modules = import.meta.glob('./questions.*.json', { eager: true })

// 詳解放在獨立的 explanations.<年>.json(以題目 id 為 key),與題庫管線解耦:
// 重跑轉檔不會覆蓋詳解。載入時依 id 合併進題目。
const explModules = import.meta.glob('./explanations.*.json', { eager: true })
const explById = {}
for (const m of Object.values(explModules)) Object.assign(explById, m.default)

const all = Object.values(modules)
  .flatMap((m) => m.default)
  .map((q) => {
    const e = explById[q.id]
    if (!e || !e.text) return q
    return { ...q, explanation: e.text, explanationStatus: e.status || 'draft' }
  })
  .sort((a, b) => a.year - b.year || a.num - b.num)

export default all

export const years = [...new Set(all.map((q) => q.year))].sort((a, b) => a - b)
