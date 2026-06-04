import { useEffect, useMemo, useState } from 'react'
import QuestionView from './QuestionView.jsx'
import { shuffle, subjectColor, preloadImage, isCorrect } from '../lib/util.js'

const TITLES = { sequential: '順序練習', random: '隨機練習', wrong: '錯題複習' }

export default function Practice({ mode, subject, year, questions, progress, onAnswer, onExit }) {
  // 依模式決定題目順序(只在進入時計算一次)
  const list = useMemo(() => {
    if (mode === 'random') return shuffle(questions)
    if (mode === 'wrong') {
      const wrong = new Set(
        Object.entries(progress.results).filter(([, r]) => !r.correct).map(([id]) => id),
      )
      return questions.filter((q) => wrong.has(q.id))
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

  // 預載接下來兩題的附圖,切題時就已在快取
  useEffect(() => {
    preloadImage(list[i + 1]?.image)
    preloadImage(list[i + 2]?.image)
  }, [i, list])

  if (list.length === 0) {
    return (
      <div className="screen">
        <p className="empty">目前沒有題目。</p>
        <button className="mode-btn" onClick={onExit}>回首頁</button>
      </div>
    )
  }

  const q = list[i]
  const chosen = answers[q.id] ?? null
  const revealed = chosen != null

  const choose = (idx) => {
    if (revealed) return
    setAnswers((a) => ({ ...a, [q.id]: idx }))
    onAnswer(q.id, idx, isCorrect(q, idx))
  }

  const answeredCount = Object.keys(answers).length
  const correctCount = Object.entries(answers).filter(
    ([id, idx]) => { const x = list.find((x) => x.id === id); return x && isCorrect(x, idx) },
  ).length

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

      <div className="progress-bar"><span style={{ width: `${((i + 1) / list.length) * 100}%` }} /></div>

      <QuestionView
        q={q}
        chosen={chosen}
        revealed={revealed}
        onChoose={choose}
        index={i}
        total={list.length}
      />

      <div className="nav">
        <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>上一題</button>
        <button
          className="primary"
          onClick={() => setI((v) => Math.min(list.length - 1, v + 1))}
          disabled={i === list.length - 1}
        >
          下一題
        </button>
      </div>
    </div>
  )
}
