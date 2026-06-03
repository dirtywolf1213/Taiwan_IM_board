// 輕量索引(eager):只含 id / year / num / subject,供首頁統計與各科/各年題數即時顯示。
import index from './index.json'

// 各年題目內容與詳解「動態載入」(非 eager),Vite 會切成各自的 chunk,按需才下載。
const qLoaders = import.meta.glob('./questions.*.json')
const eLoaders = import.meta.glob('./explanations.*.json')

export { index }
export const years = [...new Set(index.map((q) => q.year))].sort((a, b) => a - b)

const idToYear = Object.fromEntries(index.map((q) => [q.id, q.year]))

const cache = {}

async function loadYearRaw(year) {
  if (cache[year]) return cache[year]
  const q = (await qLoaders[`./questions.${year}.json`]()).default
  const eMod = eLoaders[`./explanations.${year}.json`]
  const e = eMod ? (await eMod()).default : {}
  const merged = q.map((item) => {
    const ex = e[item.id]
    return ex && ex.text
      ? { ...item, explanation: ex.text, explanationStatus: ex.status || 'draft' }
      : item
  })
  cache[year] = merged
  return merged
}

// 載入指定多個年份,合併並依年份/題號排序
export async function loadYears(yearList) {
  const uniq = [...new Set(yearList)]
  const arr = (await Promise.all(uniq.map(loadYearRaw))).flat()
  arr.sort((a, b) => a.year - b.year || a.num - b.num)
  return arr
}

export const loadYear = (year) => loadYears([year])
export const loadAll = () => loadYears(years)

// 載入「包含這些題目 id 的年份」(用於錯題複習,只載入需要的年份)
export function loadYearsForIds(ids) {
  const ys = [...new Set(ids.map((id) => idToYear[id]).filter(Boolean))]
  return loadYears(ys)
}
