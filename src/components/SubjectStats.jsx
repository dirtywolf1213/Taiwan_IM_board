import { SUBJECT_ORDER, subjectColor } from '../lib/util.js'

// 各科答對統計。stats: { [subject]: { correct, total } }
// 依科目顏色顯示「答對/總數」與正確率長條,一眼看出強弱。
export default function SubjectStats({ stats, title }) {
  const rows = SUBJECT_ORDER.filter((s) => stats[s]?.total)
  if (rows.length === 0) return null
  return (
    <div className="card subject-stats">
      {title && <p className="review-title" style={{ margin: '0 0 10px' }}>{title}</p>}
      {rows.map((s) => {
        const { correct, total } = stats[s]
        const pct = Math.round((correct / total) * 100)
        const c = subjectColor(s)
        return (
          <div key={s} className="ss-row">
            <span className="ss-name"><span className="ss-dot" style={{ background: c }} />{s}</span>
            <span className="ss-bar"><span style={{ width: `${pct}%`, background: c }} /></span>
            <span className="ss-num">{correct}/{total}</span>
          </div>
        )
      })}
    </div>
  )
}
