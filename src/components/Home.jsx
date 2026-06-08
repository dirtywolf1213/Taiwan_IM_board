import SubjectStats from './SubjectStats.jsx'
import { APP_VERSION, hasUnseenUpdate } from '../lib/version.js'

export default function Home({ index, progress, onStart, onReset, onOpenDisclaimer, onBackup, onOpenAbout }) {
  const unseen = hasUnseenUpdate()
  const total = index.length
  const results = progress.results
  const answered = Object.keys(results).length
  const correct = Object.values(results).filter((r) => r.correct).length
  const wrongIds = Object.entries(results).filter(([, r]) => !r.correct).map(([id]) => id)
  const acc = answered ? Math.round((correct / answered) * 100) : 0

  // 各科作答正確率(依歷史紀錄,用輕量索引對應科目)
  const bySubject = {}
  for (const q of index) {
    const r = results[q.id]
    if (!r) continue
    const s = (bySubject[q.subject] ||= { correct: 0, total: 0 })
    s.total++
    if (r.correct) s.correct++
  }

  return (
    <div className="home">
      <header className="hero">
        <h1>內科專科考試刷題</h1>
        <p className="sub">台灣內科專科醫師甄審・練習題庫</p>
      </header>

      <section className="stats">
        <div className="stat"><b>{total}</b><span>總題數</span></div>
        <div className="stat"><b>{answered}</b><span>已作答</span></div>
        <div className="stat"><b>{acc}%</b><span>正確率</span></div>
        <div className="stat"><b>{wrongIds.length}</b><span>錯題數</span></div>
      </section>

      <section className="modes">
        <button className="mode-btn primary" onClick={() => onStart('year')}>
          依年份練習<small>整年原卷順序・即時對答案與詳解</small>
        </button>
        <button className="mode-btn" onClick={() => onStart('subject')}>
          依科目練習<small>心臟、胸腔、消化…分科練習</small>
        </button>
        <button className="mode-btn" onClick={() => onStart('random')}>
          隨機練習<small>打亂題序</small>
        </button>
        <button
          className="mode-btn"
          onClick={() => onStart('wrong')}
          disabled={wrongIds.length === 0}
        >
          錯題複習<small>{wrongIds.length ? `${wrongIds.length} 題待複習` : '目前沒有錯題'}</small>
        </button>
        <button className="mode-btn" onClick={() => onStart('mock')}>
          模擬考<small>計時・交卷計分</small>
        </button>
      </section>

      {answered > 0 && <SubjectStats stats={bySubject} title="各科正確率" />}

      <div className="backup-links">
        {answered > 0 && <button className="link-btn" onClick={() => onBackup('export')}>匯出進度（備份）</button>}
        <button className="link-btn" onClick={() => onBackup('import')}>匯入進度（還原）</button>
        {answered > 0 && <button className="link-btn danger" onClick={onReset}>清除所有作答紀錄</button>}
      </div>

      <footer className="foot">
        <p>
          <button className="link-inline ver-btn" onClick={onOpenAbout}>
            版本 v{APP_VERSION}・更新紀錄
            {unseen && <span className="ver-dot" aria-label="有更新" />}
          </button>
        </p>
        <p>製作人:dirtywolf1213</p>
        <p>進度只存在這台裝置的瀏覽器</p>
        <p className="foot-disc">
          本服務為非官方、個人非營利學習工具,題目與答案來自醫學會公開資料,著作權歸原權利人所有。
          <button className="link-inline" onClick={onOpenDisclaimer}>閱讀完整免責聲明</button>
        </p>
      </footer>
    </div>
  )
}
