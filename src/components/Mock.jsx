import { useEffect, useMemo, useRef, useState } from 'react'
import QuestionView from './QuestionView.jsx'
import SubjectStats from './SubjectStats.jsx'
import { shuffle, fmtTime, preloadImage, isCorrect } from '../lib/util.js'

export default function Mock({ questions, progress = {}, onAnswer, onToggleFav, onSetNote, onExit }) {
  const [phase, setPhase] = useState('setup') // setup | exam | result
  const [list, setList] = useState([])
  const [answers, setAnswers] = useState({})
  const [i, setI] = useState(0)
  const [sec, setSec] = useState(0)
  const [limitSec, setLimitSec] = useState(0) // 0 = 不限時
  const timer = useRef(null)

  // setup 選項
  const [limited, setLimited] = useState(true) // 限時(每題 1 分鐘)
  const [customN, setCustomN] = useState('')

  useEffect(() => () => clearInterval(timer.current), [])

  // 預載接下來兩題的附圖
  useEffect(() => {
    preloadImage(list[i + 1]?.image)
    preloadImage(list[i + 2]?.image)
  }, [i, list])

  // 可考的年份(新到舊)
  const examYears = [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a)

  const begin = (picked) => {
    if (picked.length === 0) return
    setList(picked)
    setAnswers({})
    setI(0)
    setSec(0)
    setLimitSec(limited ? picked.length * 60 : 0) // 每題 1 分鐘
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
      if (answers[q.id] != null) onAnswer(q.id, answers[q.id], isCorrect(q, answers[q.id]))
    })
    setPhase('result')
  }

  // 限時到自動交卷
  useEffect(() => {
    if (phase === 'exam' && limitSec > 0 && sec >= limitSec) submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, limitSec, phase])

  const score = useMemo(
    () => list.filter((q) => isCorrect(q, answers[q.id])).length,
    [list, answers],
  )

  if (phase === 'setup') {
    // 含 160 題(整份考卷,等同正式考試題數);最後一項為題庫全部
    const presets = [20, 40, 80, 160].filter((n) => n < questions.length)
    const opts = [...new Set([...presets, questions.length])]
    const label = (n) =>
      n === questions.length ? `全部 ${n} 題` : n === 160 ? '160 題（整份考卷）' : `${n} 題`
    const cn = parseInt(customN, 10)
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={onExit}>← 首頁</button>
          <span className="topbar-title">模擬考</span>
          <span />
        </div>
        <div className="card">
          <p className="q-stem">選擇題數,開始計時模擬考。作答時不顯示答案,交卷後計分、各科與各考點弱點檢討。</p>

          <label className="mock-limit">
            <input type="checkbox" checked={limited} onChange={(e) => setLimited(e.target.checked)} />
            限時作答(每題 1 分鐘,時間到自動交卷)
          </label>

          <div className="count-picker">
            {opts.map((n, idx) => (
              <button key={idx} className="mode-btn" onClick={() => start(n)}>
                {label(n)}
              </button>
            ))}
          </div>

          <div className="mock-custom">
            <input
              type="number" min="1" max={questions.length} inputMode="numeric"
              placeholder="自訂題數" value={customN}
              onChange={(e) => setCustomN(e.target.value)}
            />
            <button
              className="mode-btn" disabled={!(cn >= 1)}
              onClick={() => start(cn)}
            >隨機 {cn >= 1 ? cn : ''} 題</button>
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
    const byTopic = {}
    for (const q of list) {
      const s = (bySubject[q.subject] ||= { correct: 0, total: 0 })
      s.total++
      if (isCorrect(q, answers[q.id])) s.correct++
      if (q.topic) {
        const t = (byTopic[`${q.subject}／${q.topic}`] ||= { correct: 0, total: 0 })
        t.total++
        if (isCorrect(q, answers[q.id])) t.correct++
      }
    }
    // 弱點考點:至少 2 題、正確率由低到高
    const weakTopics = Object.entries(byTopic)
      .filter(([, d]) => d.total >= 2)
      .map(([name, d]) => ({ name, ...d, pct: Math.round((d.correct / d.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8)
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
        {weakTopics.length > 0 && (
          <div className="card">
            <p className="review-title" style={{ margin: '0 0 8px' }}>考點弱點(本次・正確率低→高)</p>
            {weakTopics.map((t) => (
              <div key={t.name} className="mock-topic-row">
                <span className="mock-topic-name">{t.name}</span>
                <span className={`mock-topic-pct ${t.pct < 60 ? 'low' : ''}`}>
                  {t.correct}/{t.total}（{t.pct}%）
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="review-title">逐題檢討</p>
        {list.map((q, idx) => (
          <QuestionView key={q.id} q={q} chosen={answers[q.id] ?? null} revealed index={idx} total={list.length}
            favorited={(progress.favorites || []).includes(q.id)} onToggleFav={onToggleFav}
            note={(progress.notes || {})[q.id]} onSetNote={onSetNote} />
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
  const remain = limitSec > 0 ? Math.max(0, limitSec - sec) : null
  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={submit}>交卷</button>
        <span className={`topbar-title ${remain != null && remain <= 300 ? 'time-low' : ''}`}>
          ⏱ {remain != null ? `剩 ${fmtTime(remain)}` : fmtTime(sec)}
        </span>
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
        favorited={(progress.favorites || []).includes(q.id)}
        onToggleFav={onToggleFav}
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
