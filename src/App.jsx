import { useEffect, useState } from 'react'
import questions from './data/questions.js'
import { loadProgress, saveProgress } from './lib/storage.js'
import Home from './components/Home.jsx'
import Practice from './components/Practice.jsx'
import Mock from './components/Mock.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import SubjectPicker from './components/SubjectPicker.jsx'

const DISCLAIMER_KEY = 'tim_disclaimer_v1'

export default function App() {
  const [view, setView] = useState('home') // home | practice | mock | subjects
  const [mode, setMode] = useState('sequential')
  const [subject, setSubject] = useState(null)
  const [progress, setProgress] = useState(loadProgress)
  // 首次進入需閱讀同意免責聲明
  const [agreed, setAgreed] = useState(() => {
    try { return localStorage.getItem(DISCLAIMER_KEY) === '1' } catch { return false }
  })
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => saveProgress(progress), [progress])

  const agree = () => {
    try { localStorage.setItem(DISCLAIMER_KEY, '1') } catch { /* ignore */ }
    setAgreed(true)
  }

  // 尚未同意 → 顯示閘門,擋住所有功能
  if (!agreed) {
    return <Disclaimer onAgree={agree} />
  }

  const recordAnswer = (id, chosen, correct) => {
    setProgress((p) => ({
      ...p,
      results: { ...p.results, [id]: { chosen, correct, ts: Date.now() } },
    }))
  }

  const start = (m) => {
    if (m === 'mock') {
      setView('mock')
    } else if (m === 'subject') {
      setView('subjects')
    } else {
      setMode(m)
      setView('practice')
    }
  }

  const pickSubject = (s) => {
    setSubject(s)
    setMode('subject')
    setView('practice')
  }

  const reset = () => {
    if (confirm('確定要清除所有作答紀錄嗎?此動作無法復原。')) {
      setProgress({ results: {}, favorites: [] })
    }
  }

  if (view === 'subjects') {
    return (
      <SubjectPicker
        questions={questions}
        onPick={pickSubject}
        onExit={() => setView('home')}
      />
    )
  }

  if (view === 'practice') {
    return (
      <Practice
        mode={mode}
        subject={subject}
        questions={questions}
        progress={progress}
        onAnswer={recordAnswer}
        onExit={() => setView('home')}
      />
    )
  }

  if (view === 'mock') {
    return (
      <Mock
        questions={questions}
        onAnswer={recordAnswer}
        onExit={() => setView('home')}
      />
    )
  }

  return (
    <>
      <Home
        questions={questions}
        progress={progress}
        onStart={start}
        onReset={reset}
        onOpenDisclaimer={() => setShowDisclaimer(true)}
      />
      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}
    </>
  )
}
