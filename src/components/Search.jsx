import { useMemo, useState } from 'react'
import QuestionView from './QuestionView.jsx'
import { subjectColor } from '../lib/util.js'

// 全題庫搜尋:比對題幹/選項文字、題號、科目、考點。點結果即可檢視該題與詳解。
export default function Search({ questions, progress, onToggleFav, onSetNote, onExit }) {
  const [qstr, setQstr] = useState('')
  const [sel, setSel] = useState(null)

  const results = useMemo(() => {
    const s = qstr.trim().toLowerCase()
    if (!s) return []
    return questions.filter((q) =>
      q.question.toLowerCase().includes(s) ||
      (q.options || []).some((o) => o.toLowerCase().includes(s)) ||
      q.id.toLowerCase().includes(s) ||
      (q.subject || '').toLowerCase().includes(s) ||
      (q.topic || '').toLowerCase().includes(s),
    ).slice(0, 60)
  }, [qstr, questions])

  if (sel) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={() => setSel(null)}>← 搜尋結果</button>
          <span className="topbar-title">檢視題目</span>
          <span />
        </div>
        <QuestionView
          q={sel}
          chosen={null}
          revealed
          onChoose={() => {}}
          index={0}
          total={1}
          favorited={(progress.favorites || []).includes(sel.id)}
          onToggleFav={onToggleFav}
          note={(progress.notes || {})[sel.id]}
          onSetNote={onSetNote}
        />
        <div className="nav">
          <button onClick={() => setSel(null)}>← 回搜尋結果</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onExit}>← 首頁</button>
        <span className="topbar-title">搜尋題目</span>
        <span />
      </div>

      <input
        className="search-input"
        autoFocus
        placeholder="關鍵字、題號(如 114-001)、科目或考點(如 ACS、HF)…"
        value={qstr}
        onChange={(e) => setQstr(e.target.value)}
      />
      <p className="search-hint">
        {qstr.trim()
          ? `找到 ${results.length} 題${results.length >= 60 ? '(只顯示前 60,請再縮小範圍)' : ''}`
          : '可搜尋題幹／選項文字、題號、科目、考點縮寫'}
      </p>

      <div className="search-list">
        {results.map((q) => (
          <button key={q.id} className="search-item" onClick={() => setSel(q)}>
            <span className="search-item-meta">
              <span
                className="subject-chip"
                style={{ color: subjectColor(q.subject), background: `${subjectColor(q.subject)}1f` }}
              >
                {q.subject}
              </span>
              {q.topic && <span className="topic-chip">{q.topic}</span>}
              <span className="search-id">{q.id}</span>
            </span>
            <span className="search-stem">{q.question}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
