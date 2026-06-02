import { useEffect, useMemo, useRef, useState } from 'react'
import QuestionView from './QuestionView.jsx'
import SubjectStats from './SubjectStats.jsx'
import { shuffle, fmtTime } from '../lib/util.js'

export default function Mock({ questions, onAnswer, onExit }) {
  const [phase, setPhase] = useState('setup') // setup | exam | result
  const [list, setList] = useState([])
  const [answers, setAnswers] = useState({})
  const [i, setI] = useState(0)
  const [sec, setSec] = useState(0)
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  // 可考的年份(新到舊)
  const examYears = [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a)

  const begin = (picked) => {
    setList(picked)
    setAnswers({})
    setI(0)
    setSec(0)
    setPhase('exam')
    timer.current = setInterval(() => setSec((s) => s + 1), 1000)
  }

  // 隨機抽 n 題
  const start = (n) => begin(shuffle(questions).slice(0, Math.min(n, questions.length)))
  // 某一年整份原卷(照題號順序)
  const startYear = (y) =>
    begin(questions.filter((q) => q.year === y).sort((a, b) => a.num - b.num))

  const submit = () => {
    clearInterval(timer.current)
    list.forEach((q) => {
      if (answers[q.id] != null) onAnswer(q.id, answers[q.id], answers[q.id] === q.answer)
    })
    setPhase('result')
  }

  const score = useMemo(
    () => list.filter((q) => answers[q.id] === q.answer).length,
    [list, answers],
  )

  if (phase === 'setup') {
    // 含 160 題(整份考卷,等同正式考試題數);最後一項為題庫全部
    const presets = [20, 40, 80, 160].filter((n) => n < questions.length)
    const opts = [...new Set([...presets, questions.length])]
    const label = (n) =>
      n === questions.length ? `全部 ${n} 題` : n === 160 ? '160 題（整份考卷）' : `${n} 題`
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={onExit}>← 首頁</button>
          <span className="topbar-title">模擬考</span>
          <span />
        </div>
        <div className="card">
          <p className="q-stem">選擇題數,開始計時模擬考。作答時不顯示答案,交卷後計分與檢討。</p>
          <div className="count-picker">
            {opts.map((n, idx) => (
              <button key={idx} className="mode-btn" onClick={() => start(n)}>
                {label(n)}
              </button>
            ))}
          </div>

          <p className="q-stem" style={{ marginTop: 20 }}>
            依年份考整份(原卷題號順序,共 160 題):
          </p>
          <div className="count-picker">
            {examYears.map((y) => (
              <button key={y} className="mode-btn" onClick={() => startYear(y)}>
                {y} 年整份
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const pct = Math.round((score / list.length) * 100)
    const bySubject = {}
    for (const q of list) {
      const s = (bySubject[q.subject] ||= { correct: 0, total: 0 })
      s.total++
      if (answers[q.id] === q.answer) s.correct++
    }
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={onExit}>← 首頁</button>
          <span className="topbar-title">成績</span>
          <span />
        </div>
        <div className="card result-summary">
          <div className="big-score">{pct}<small>分</small></div>
          <p>{list.length} 題答對 {score} 題・用時 {fmtTime(sec)}</p>
        </div>
        <SubjectStats stats={bySubject} title="各科答對統計" />
        <p className="review-title">逐題檢討</p>
        {list.map((q, idx) => (
          <QuestionView key={q.id} q={q} chosen={answers[q.id] ?? null} revealed index={idx} total={list.length} />
        ))}
        <div className="nav">
          <button className="primary" onClick={onExit}>回首頁</button>
        </div>
      </div>
    )
  }

  // phase === 'exam'
  const q = list[i]
  const answeredN = Object.keys(answers).length
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={submit}>交卷</button>
        <span className="topbar-title">⏱ {fmtTime(sec)}</span>
        <span className="topbar-score">{answeredN}/{list.length}</span>
      </div>

      <div className="progress-bar"><span style={{ width: `${((i + 1) / list.length) * 100}%` }} /></div>

      <QuestionView
        q={q}
        chosen={answers[q.id] ?? null}
        revealed={false}
        onChoose={(idx) => setAnswers((a) => ({ ...a, [q.id]: idx }))}
        index={i}
        total={list.length}
      />

      <div className="grid-jump">
        {list.map((qq, idx) => (
          <button
            key={qq.id}
            className={`jump ${answers[qq.id] != null ? 'done' : ''} ${idx === i ? 'cur' : ''}`}
            onClick={() => setI(idx)}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="nav">
        <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>上一題</button>
        {i === list.length - 1 ? (
          <button className="primary" onClick={submit}>交卷</button>
        ) : (
          <button className="primary" onClick={() => setI((v) => v + 1)}>下一題</button>
        )}
      </div>
    </div>
  )
}
