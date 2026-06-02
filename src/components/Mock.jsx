import { useEffect, useMemo, useRef, useState } from 'react'
import QuestionView from './QuestionView.jsx'
import { shuffle, fmtTime } from '../lib/util.js'

export default function Mock({ questions, onAnswer, onExit }) {
  const [phase, setPhase] = useState('setup') // setup | exam | result
  const [count, setCount] = useState(20)
  const [list, setList] = useState([])
  const [answers, setAnswers] = useState({})
  const [i, setI] = useState(0)
  const [sec, setSec] = useState(0)
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  const start = (n) => {
    const picked = shuffle(questions).slice(0, Math.min(n, questions.length))
    setList(picked)
    setAnswers({})
    setI(0)
    setSec(0)
    setPhase('exam')
    timer.current = setInterval(() => setSec((s) => s + 1), 1000)
  }

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
    const opts = [20, 40, 80, questions.length]
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
                {n === questions.length ? `全部 ${n} 題` : `${n} 題`}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const pct = Math.round((score / list.length) * 100)
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
