import { useEffect, useState } from 'react'
import { index, loadAll, loadYear, loadYearsForIds } from './data/questions.js'
import { loadProgress, saveProgress } from './lib/storage.js'
import { nextSrs, dueIds } from './lib/srs.js'
import Home from './components/Home.jsx'
import Practice from './components/Practice.jsx'
import Mock from './components/Mock.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import SubjectPicker from './components/SubjectPicker.jsx'
import YearPicker from './components/YearPicker.jsx'
import BackupModal from './components/BackupModal.jsx'
import AboutModal from './components/AboutModal.jsx'
import UserManual from './components/UserManual.jsx'
import StatsModal from './components/StatsModal.jsx'
import Search from './components/Search.jsx'
import QuestionView from './components/QuestionView.jsx'
import FeedbackModal from './components/FeedbackModal.jsx'

const DISCLAIMER_KEY = 'tim_disclaimer_v1'

export default function App() {
  const [view, setView] = useState('home') // home | subjects | years | practice | mock
  const [mode, setMode] = useState('random')
  const [subject, setSubject] = useState(null)
  const [year, setYear] = useState(null)
  const [session, setSession] = useState([]) // 本次模式已載入的題目
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(loadProgress)
  const [agreed, setAgreed] = useState(() => {
    try { return localStorage.getItem(DISCLAIMER_KEY) === '1' } catch { return false }
  })
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [backup, setBackup] = useState(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [feedback, setFeedback] = useState(null) // null | { type:'wish'|'report', qid }

  // 開啟許願/意見視窗;帶 qid 表示「回報這題」
  const openFeedback = (qid) => setFeedback({ type: qid ? 'report' : 'wish', qid: qid || '' })

  useEffect(() => saveProgress(progress), [progress])

  // 單題分享連結:網址含 #q=114-001 時,同意免責後直接開啟該題
  useEffect(() => {
    if (!agreed) return
    const m = (window.location.hash || '').match(/#q=(\d{3}-\d{3})/)
    if (!m || !index.some((q) => q.id === m[1])) return
    let alive = true
    setLoading(true)
    loadYearsForIds([m[1]]).then((arr) => {
      if (!alive) return
      setSession(arr.filter((x) => x.id === m[1]))
      setView('single')
      setLoading(false)
    })
    return () => { alive = false }
  }, [agreed])

  const agree = () => {
    try { localStorage.setItem(DISCLAIMER_KEY, '1') } catch { /* ignore */ }
    setAgreed(true)
  }

  if (!agreed) {
    return <Disclaimer onAgree={agree} />
  }

  const recordAnswer = (id, chosen, correct) => {
    setProgress((p) => ({
      ...p,
      results: { ...p.results, [id]: { chosen, correct } },
      srs: { ...p.srs, [id]: nextSrs(p.srs?.[id], correct) },
    }))
  }

  const toggleFavorite = (id) => {
    setProgress((p) => {
      const favs = p.favorites || []
      const has = favs.includes(id)
      return { ...p, favorites: has ? favs.filter((x) => x !== id) : [...favs, id] }
    })
  }

  const setNote = (id, text) => {
    setProgress((p) => {
      const notes = { ...(p.notes || {}) }
      if (text && text.trim()) notes[id] = text; else delete notes[id]
      return { ...p, notes }
    })
  }

  // 動態載入需要的年份後再進入該畫面
  const enter = async (loader, nextView) => {
    setLoading(true)
    try {
      setSession(await loader())
      setView(nextView)
    } finally {
      setLoading(false)
    }
  }

  const start = (m) => {
    if (m === 'subject') {
      setView('subjects')
    } else if (m === 'year') {
      setView('years')
    } else if (m === 'mock') {
      enter(loadAll, 'mock')
    } else if (m === 'wrong') {
      const wrongIds = Object.entries(progress.results)
        .filter(([, r]) => !r.correct).map(([id]) => id)
      setMode('wrong')
      enter(() => loadYearsForIds(wrongIds), 'practice')
    } else if (m === 'fav') {
      setMode('fav')
      enter(() => loadYearsForIds(progress.favorites || []), 'practice')
    } else if (m === 'due') {
      setMode('due')
      enter(() => loadYearsForIds(dueIds(progress.srs)), 'practice')
    } else {
      setMode('random')
      enter(loadAll, 'practice')
    }
  }

  const pickSubject = (s) => {
    setSubject(s)
    setMode('subject')
    enter(loadAll, 'practice') // 各年皆有該科,需全部載入後篩選
  }

  const pickYear = (y) => {
    setYear(y)
    setMode('year')
    enter(() => loadYear(y), 'practice') // 只載入該年
  }

  const openSearch = () => enter(loadAll, 'search') // 搜尋需全題庫,載入後在前端即時比對

  const reset = () => {
    if (confirm('確定要清除所有作答紀錄嗎?此動作無法復原。')) {
      setProgress({ results: {}, favorites: [], notes: {}, srs: {} })
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" />載入題庫中…</div>
  }

  if (view === 'subjects') {
    return <SubjectPicker index={index} onPick={pickSubject} onExit={() => setView('home')} />
  }

  if (view === 'years') {
    return <YearPicker index={index} onPick={pickYear} onExit={() => setView('home')} />
  }

  if (view === 'practice') {
    return (
      <Practice
        mode={mode}
        subject={subject}
        year={year}
        questions={session}
        progress={progress}
        onAnswer={recordAnswer}
        onToggleFav={toggleFavorite}
        onSetNote={setNote}
        onReport={openFeedback}
        onExit={() => setView('home')}
      />
    )
  }

  if (view === 'single') {
    const q = session[0]
    const goHome = () => {
      try { window.history.replaceState(null, '', import.meta.env.BASE_URL || '/') } catch { /* ignore */ }
      setView('home')
    }
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={goHome}>← 首頁</button>
          <span className="topbar-title">分享的題目</span>
          <span />
        </div>
        {q ? (
          <QuestionView
            q={q} chosen={null} revealed onChoose={() => {}} index={0} total={1}
            favorited={(progress.favorites || []).includes(q.id)}
            onToggleFav={toggleFavorite}
            note={(progress.notes || {})[q.id]}
            onSetNote={setNote}
            onReport={openFeedback}
          />
        ) : <p className="empty">找不到這題。</p>}
      </div>
    )
  }

  if (view === 'search') {
    return (
      <Search
        questions={session}
        progress={progress}
        onToggleFav={toggleFavorite}
        onSetNote={setNote}
        onReport={openFeedback}
        onExit={() => setView('home')}
      />
    )
  }

  if (view === 'mock') {
    return (
      <Mock
        questions={session}
        progress={progress}
        onAnswer={recordAnswer}
        onToggleFav={toggleFavorite}
        onSetNote={setNote}
        onReport={openFeedback}
        onExit={() => setView('home')}
      />
    )
  }

  return (
    <>
      <Home
        index={index}
        progress={progress}
        onStart={start}
        onReset={reset}
        onOpenDisclaimer={() => setShowDisclaimer(true)}
        onBackup={setBackup}
        onOpenAbout={() => setShowAbout(true)}
        onOpenManual={() => setShowManual(true)}
        onOpenStats={() => setShowStats(true)}
        onOpenSearch={openSearch}
        onOpenFeedback={() => openFeedback()}
      />
      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showManual && <UserManual onClose={() => setShowManual(false)} />}
      {showStats && <StatsModal index={index} progress={progress} onClose={() => setShowStats(false)} />}
      {feedback && <FeedbackModal init={feedback} onClose={() => setFeedback(null)} />}
      {backup && (
        <BackupModal
          mode={backup}
          progress={progress}
          onApply={(p) => { setProgress(p); setBackup(null) }}
          onClose={() => setBackup(null)}
        />
      )}
    </>
  )
}
