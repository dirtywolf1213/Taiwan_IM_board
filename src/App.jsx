import { useEffect, useState } from 'react'
import questions from './data/questions.js'
import { loadProgress, saveProgress } from './lib/storage.js'
import Home from './components/Home.jsx'
import Practice from './components/Practice.jsx'
import Mock from './components/Mock.jsx'

export default function App() {
  const [view, setView] = useState('home') // home | practice | mock
  const [mode, setMode] = useState('sequential')
  const [progress, setProgress] = useState(loadProgress)

  useEffect(() => saveProgress(progress), [progress])

  const recordAnswer = (id, chosen, correct) => {
    setProgress((p) => ({
      ...p,
      results: { ...p.results, [id]: { chosen, correct, ts: Date.now() } },
    }))
  }

  const start = (m) => {
    if (m === 'mock') {
      setView('mock')
    } else {
      setMode(m)
      setView('practice')
    }
  }

  const reset = () => {
    if (confirm('確定要清除所有作答紀錄嗎?此動作無法復原。')) {
      setProgress({ results: {}, favorites: [] })
    }
  }

  if (view === 'practice') {
    return (
      <Practice
        mode={mode}
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
    <Home questions={questions} progress={progress} onStart={start} onReset={reset} />
  )
}
