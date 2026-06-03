// 依年份選擇練習。列出各年題數,點選後照原卷題號順序練習(即時對答案)。
export default function YearPicker({ index, onPick, onExit }) {
  const counts = {}
  for (const q of index) counts[q.year] = (counts[q.year] || 0) + 1
  const years = [...new Set(index.map((q) => q.year))].sort((a, b) => b - a)

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={onExit}>← 首頁</button>
        <span className="topbar-title">依年份練習</span>
        <span />
      </div>
      <p className="picker-hint">照原卷題號順序、即時對答案與詳解。</p>
      <div className="modes">
        {years.map((y) => (
          <button key={y} className="mode-btn" onClick={() => onPick(y)}>
            {y} 年<small>{counts[y]} 題・原卷順序</small>
          </button>
        ))}
      </div>
    </div>
  )
}
