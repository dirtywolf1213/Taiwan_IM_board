// 自動載入所有 questions.<年>.json,之後新增年份只要把檔案放進此資料夾即可。
const modules = import.meta.glob('./questions.*.json', { eager: true })

const all = Object.values(modules)
  .flatMap((m) => m.default)
  .sort((a, b) => a.year - b.year || a.num - b.num)

export default all

export const years = [...new Set(all.map((q) => q.year))].sort((a, b) => a - b)
