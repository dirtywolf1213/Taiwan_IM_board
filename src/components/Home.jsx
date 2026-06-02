export default function Home({ questions, progress, onStart, onReset }) {
  const total = questions.length
  const results = progress.results
  const answered = Object.keys(results).length
  const correct = Object.values(results).filter((r) => r.correct).length
  const wrongIds = Object.entries(results).filter(([, r]) => !r.correct).map(([id]) => id)
  const acc = answered ? Math.round((correct / answered) * 100) : 0

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
        <button className="mode-btn primary" onClick={() => onStart('sequential')}>
          順序練習<small>依題號 1 → {total}</small>
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

      {answered > 0 && (
        <button className="link-btn" onClick={onReset}>清除所有作答紀錄</button>
      )}

      <footer className="foot">進度只存在這台裝置的瀏覽器</footer>
    </div>
  )
}
