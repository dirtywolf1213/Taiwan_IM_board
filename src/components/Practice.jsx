import { useEffect, useMemo, useState } from 'react'
import QuestionView from './QuestionView.jsx'
import ExportMenu from './ExportMenu.jsx'
import { shuffle, subjectColor, preloadImage, isCorrect } from '../lib/util.js'
import { dueIds } from '../lib/srs.js'

const TITLES = { sequential: '順序練習', random: '隨機練習', wrong: '錯題複習', fav: '我的收藏', due: '到期複習' }

export default function Practice({ mode, subject, year, questions, progress, onAnswer, onToggleFav, onSetNote, onExit }) {
  // 依模式決定題目順序(只在進入時計算一次)
  const list = useMemo(() => {
    if (mode === 'random') return shuffle(questions)
    if (mode === 'wrong') {
      const wrong = new Set(
        Object.entries(progress.results).filter(([, r]) => !r.correct).map(([id]) => id),
      )
      return questions.filter((q) => wrong.has(q.id))
    }
    if (mode === 'fav') {
      const favs = new Set(progress.favorites || [])
      return questions.filter((q) => favs.has(q.id)).sort((a, b) => b.year - a.year || a.num - b.num)
    }
    if (mode === 'due') {
      const due = new Set(dueIds(progress.srs))
      return questions.filter((q) => due.has(q.id)).sort((a, b) => b.year - a.year || a.num - b.num)
    }
    if (mode === 'subject') return questions.filter((q) => q.subject === subject)
    if (mode === 'year') {
      return questions.filter((q) => q.year === year).sort((a, b) => a.num - b.num)
    }
    return questions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, subject, year])

  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({}) // 本次 session: { id: chosenIndex }
  const [showJump, setShowJump] = useState(false)
  const [topic, setTopic] = useState(null) // 考點次篩選(只在依科目練習時出現)

  // 該科有哪些考點(依題數排序);只有依科目練習、且該科已有考點分類時才顯示
  const topics = useMemo(() => {
    if (mode !== 'subject') return []
    const m = new Map()
    for (const q of list) if (q.topic) m.set(q.topic, (m.get(q.topic) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [list, mode])

  // 套用考點篩選後實際要練的題目
  const shown = useMemo(() => (topic ? list.filter((q) => q.topic === topic) : list), [list, topic])

  const pickTopic = (t) => { setTopic(t); setI(0); setShowJump(false) }

  // 預載接下來兩題的附圖,切題時就已在快取
  useEffect(() => {
    preloadImage(shown[i + 1]?.image)
    preloadImage(shown[i + 2]?.image)
  }, [i, shown])

  if (shown.length === 0) {
    return (
      <div className="screen">
        <p className="empty">目前沒有題目。</p>
        <button className="mode-btn" onClick={onExit}>回首頁</button>
      </div>
    )
  }

  const q = shown[i]
  const chosen = answers[q.id] ?? null
  const revealed = chosen != null

  const choose = (idx) => {
    if (revealed) return
    setAnswers((a) => ({ ...a, [q.id]: idx }))
    onAnswer(q.id, idx, isCorrect(q, idx))
  }

  const answeredCount = shown.filter((x) => answers[x.id] != null).length
  const correctCount = shown.filter((x) => answers[x.id] != null && isCorrect(x, answers[x.id])).length

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onExit}>← 首頁</button>
        <span
          className="topbar-title"
          style={mode === 'subject' ? { color: subjectColor(subject) } : undefined}
        >
          {mode === 'subject' ? subject : mode === 'year' ? `${year} 年練習` : TITLES[mode]}
        </span>
        <span className="topbar-score">{correctCount}/{answeredCount}</span>
      </div>

      {topics.length > 1 && (
        <div className="topic-bar">
          <button className={`topic-pill ${topic == null ? 'on' : ''}`} onClick={() => pickTopic(null)}>
            全部 {list.length}
          </button>
          {topics.map(([t, n]) => (
            <button key={t} className={`topic-pill ${topic === t ? 'on' : ''}`} onClick={() => pickTopic(t)}>
              {t} {n}
            </button>
          ))}
        </div>
      )}

      <div className="jump-row">
        <div className="progress-bar"><span style={{ width: `${((i + 1) / shown.length) * 100}%` }} /></div>
        <ExportMenu questions={shown} label="匯出" compact drop="down" />
        <button className="jump-toggle" onClick={() => setShowJump((v) => !v)}>
          跳題 {showJump ? '▲' : '▼'}
        </button>
      </div>

      {showJump && (
        <div className="jump-panel">
          <p className="jump-hint">
            <span className="lg ok" />答對
            <span className="lg no" />答錯
            <span className="dot" />有詳解
          </p>
          <p className="jump-note">已作答的題目會永久標記(綠=答對、紅=答錯,含過去紀錄);點題號可直接跳。</p>
          <div className="grid-jump">
            {shown.map((qq, idx) => {
              // 本回合作答優先,否則看歷史紀錄(localStorage) → 已作答永久標記、並區分對/錯
              const sess = answers[qq.id]
              const r = sess != null ? { correct: isCorrect(qq, sess) } : progress.results[qq.id]
              const mark = r ? (r.correct ? 'done ok' : 'done no') : ''
              return (
                <button
                  key={qq.id}
                  className={`jump ${mark} ${idx === i ? 'cur' : ''} ${qq.explanation ? 'expl' : ''}`}
                  onClick={() => { setI(idx); setShowJump(false) }}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <QuestionView
        q={q}
        chosen={chosen}
        revealed={revealed}
        onChoose={choose}
        index={i}
        total={shown.length}
        favorited={(progress.favorites || []).includes(q.id)}
        onToggleFav={onToggleFav}
        note={(progress.notes || {})[q.id]}
        onSetNote={onSetNote}
      />

      <div className="nav">
        <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>上一題</button>
        <button
          className="primary"
          onClick={() => setI((v) => Math.min(shown.length - 1, v + 1))}
          disabled={i === shown.length - 1}
        >
          下一題
        </button>
      </div>
    </div>
  )
}
