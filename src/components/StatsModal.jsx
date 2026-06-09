import { SUBJECT_ORDER, subjectColor } from '../lib/util.js'
import { APP_VERSION } from '../lib/version.js'

// 由 index(全題)+ progress.results 算出各科 / 各年的「完成度」與「正確率」。
function compute(index, progress) {
  const results = progress?.results || {}
  const subj = {}; const yr = {}
  const all = { total: 0, answered: 0, correct: 0 }
  for (const q of index) {
    const s = (subj[q.subject] ||= { total: 0, answered: 0, correct: 0 })
    const y = (yr[q.year] ||= { total: 0, answered: 0, correct: 0 })
    s.total++; y.total++; all.total++
    const r = results[q.id]
    if (r) {
      s.answered++; y.answered++; all.answered++
      if (r.correct) { s.correct++; y.correct++; all.correct++ }
    }
  }
  return { subj, yr, all }
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

function Bar({ value, color }) {
  return <span className="ss-bar"><span style={{ width: `${value}%`, background: color }} /></span>
}

export default function StatsModal({ index, progress, onClose }) {
  const { subj, yr, all } = compute(index, progress)
  const subjects = SUBJECT_ORDER.filter((s) => subj[s])
  const years = Object.keys(yr).map(Number).sort((a, b) => b - a)

  // 最弱前 3 科(至少答 5 題才納入)
  const weak = subjects
    .filter((s) => subj[s].answered >= 5)
    .sort((a, b) => pct(subj[a].correct, subj[a].answered) - pct(subj[b].correct, subj[b].answered))
    .slice(0, 3)

  const report = () => {
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    const row = (name, d) =>
      `<tr><td>${esc(name)}</td><td>${d.answered}/${d.total}（${pct(d.answered, d.total)}%）</td>` +
      `<td>${d.correct}/${d.answered}（${pct(d.correct, d.answered)}%）</td></tr>`
    const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>學習報告</title>
<style>
@page{margin:16mm} body{font-family:"PingFang TC","Microsoft JhengHei",system-ui,sans-serif;color:#1f2937;padding:16px}
h1{font-size:20px;color:#0f766e;margin:0 0 2px} .meta{color:#6b7280;font-size:12px;margin:0 0 16px}
h2{font-size:15px;color:#0f766e;margin:18px 0 6px} table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left} th{background:#f0fdfa}
.sum{display:flex;gap:18px;margin:8px 0 4px;font-size:14px} .sum b{color:#0f766e;font-size:18px}
.weak{color:#b45309} .toolbar button{font-size:14px;padding:8px 16px;border:none;border-radius:8px;background:#0f766e;color:#fff;cursor:pointer}
@media print{.toolbar{display:none}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">列印 / 存成 PDF</button></div>
<h1>內科刷題・學習報告</h1>
<p class="meta">${new Date().toLocaleString('zh-TW')}・版本 ${esc(APP_VERSION)}</p>
<div class="sum"><span>已作答 <b>${all.answered}</b> / ${all.total}（${pct(all.answered, all.total)}%）</span>
<span>正確率 <b>${pct(all.correct, all.answered)}%</b></span></div>
${weak.length ? `<p class="weak">⚠ 較弱科目:${weak.map((s) => `${s}（${pct(subj[s].correct, subj[s].answered)}%）`).join('、')}</p>` : ''}
<h2>各科</h2><table><tr><th>科目</th><th>完成度</th><th>正確率</th></tr>${subjects.map((s) => row(s, subj[s])).join('')}</table>
<h2>各年</h2><table><tr><th>年度</th><th>完成度</th><th>正確率</th></tr>${years.map((y) => row(`${y} 年`, yr[y])).join('')}</table>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print()}catch(e){}},400)})</script>
</body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert('請允許彈出視窗以匯出報告'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="學習統計">
        <h2 className="modal-title">學習統計</h2>
        <p className="modal-updated">
          已作答 <strong>{all.answered}</strong> / {all.total}（{pct(all.answered, all.total)}%）・
          正確率 <strong>{pct(all.correct, all.answered)}%</strong>
        </p>
        <div className="modal-body">
          {weak.length > 0 && (
            <p className="stats-weak">⚠ 較弱科目:{weak.map((s) => `${s}（${pct(subj[s].correct, subj[s].answered)}%）`).join('、')}</p>
          )}

          <h3 className="stats-h">各科(完成度 ・ 正確率)</h3>
          {subjects.map((s) => {
            const d = subj[s]; const c = subjectColor(s)
            return (
              <div key={s} className="stats-row">
                <span className="stats-name"><span className="ss-dot" style={{ background: c }} />{s}</span>
                <span className="stats-bars">
                  <Bar value={pct(d.answered, d.total)} color="#94a3b8" />
                  <Bar value={pct(d.correct, d.answered)} color={c} />
                </span>
                <span className="stats-num">{pct(d.answered, d.total)}% ・ {pct(d.correct, d.answered)}%</span>
              </div>
            )
          })}

          <h3 className="stats-h">各年(完成度 ・ 正確率)</h3>
          {years.map((y) => {
            const d = yr[y]
            return (
              <div key={y} className="stats-row">
                <span className="stats-name">{y} 年</span>
                <span className="stats-bars">
                  <Bar value={pct(d.answered, d.total)} color="#94a3b8" />
                  <Bar value={pct(d.correct, d.answered)} color="#0f766e" />
                </span>
                <span className="stats-num">{pct(d.answered, d.total)}% ・ {pct(d.correct, d.answered)}%</span>
              </div>
            )
          })}
          <p className="stats-legend">灰=完成度(答了/總題)・綠/彩=正確率(答對/已答)</p>
        </div>
        <div className="modal-actions update-modal-actions">
          <button className="mode-btn primary" onClick={report} disabled={all.answered === 0}>🖨 匯出學習報告(PDF)</button>
          <button className="mode-btn" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}
