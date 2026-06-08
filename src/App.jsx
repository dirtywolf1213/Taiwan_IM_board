import { useEffect, useState } from 'react'
import { index, loadAll, loadYear, loadYearsForIds } from './data/questions.js'
import { loadProgress, saveProgress } from './lib/storage.js'
import Home from './components/Home.jsx'
import Practice from './components/Practice.jsx'
import Mock from './components/Mock.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import SubjectPicker from './components/SubjectPicker.jsx'
import YearPicker from './components/YearPicker.jsx'
import BackupModal from './components/BackupModal.jsx'
import AboutModal from './components/AboutModal.jsx'

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

  useEffect(() => saveProgress(progress), [progress])

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
      results: { ...p.results, [id]: { chosen, correct, ts: Date.now() } },
    }))
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

  const reset = () => {
    if (confirm('確定要清除所有作答紀錄嗎?此動作無法復原。')) {
      setProgress({ results: {}, favorites: [] })
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
        onExit={() => setView('home')}
      />
    )
  }

  if (view === 'mock') {
    return <Mock questions={session} onAnswer={recordAnswer} onExit={() => setView('home')} />
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
      />
      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
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
