import { SUBJECT_ORDER, subjectColor } from '../lib/util.js'

// 依科目選擇練習。顯示各科題數,點選後開始該科練習(跨所有年份)。
export default function SubjectPicker({ index, onPick, onExit }) {
  const counts = {}
  for (const q of index) counts[q.subject] = (counts[q.subject] || 0) + 1
  const subjects = SUBJECT_ORDER.filter((s) => counts[s])

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onExit}>← 首頁</button>
        <span className="topbar-title">依科目練習</span>
        <span />
      </div>
      <div className="subject-grid">
        {subjects.map((s) => {
          const c = subjectColor(s)
          return (
            <button
              key={s}
              className="subject-btn"
              onClick={() => onPick(s)}
              style={{ borderLeft: `6px solid ${c}`, background: `${c}12` }}
            >
              <span className="subject-name" style={{ color: c }}>{s}</span>
              <span className="subject-count">{counts[s]} 題</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
