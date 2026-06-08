import { useEffect, useState } from 'react'
import { APP_VERSION, BUILD_TIME, GIT_SHA, CHANGELOG, markVersionSeen, forceRefresh } from '../lib/version.js'

function fmtBuild(iso) {
  try {
    const d = new Date(iso)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return iso }
}

export default function AboutModal({ onClose }) {
  const [refreshing, setRefreshing] = useState(false)

  // 開啟即視為「已看過此版本」(清除首頁紅點)
  useEffect(() => { markVersionSeen() }, [])

  const refresh = async () => { setRefreshing(true); await forceRefresh() }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="版本與更新">
        <h2 className="modal-title">版本與更新</h2>
        <p className="modal-updated">
          目前版本 <strong>v{APP_VERSION}</strong>・建置 {fmtBuild(BUILD_TIME)}・{GIT_SHA}
        </p>

        <div className="modal-actions" style={{ marginTop: 0, marginBottom: 4 }}>
          <button className="mode-btn primary" onClick={refresh} disabled={refreshing}>
            {refreshing ? '更新中…' : '🔄 刷新到最新版'}
          </button>
        </div>
        <p className="about-hint">
          若覺得內容沒更新到,按上面的按鈕會清除快取並重新載入最新版。
        </p>

        <div className="modal-body">
          {CHANGELOG.map((c) => (
            <section key={c.version} className="disc-sec">
              <h3>v{c.version} <span className="about-date">{c.date}</span></h3>
              <ul className="about-list">
                {c.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <div className="modal-actions">
          <button className="mode-btn" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}
