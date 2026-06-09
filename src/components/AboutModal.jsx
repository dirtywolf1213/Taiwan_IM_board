import { useEffect, useState } from 'react'
import { APP_VERSION, BUILD_TIME, GIT_SHA, CHANGELOG, markVersionSeen, forceRefresh } from '../lib/version.js'
import { loadProgress } from '../lib/storage.js'
import { encodeProgress, downloadBackup, countAnswered } from '../lib/backup.js'

function fmtBuild(iso) {
  try {
    const d = new Date(iso)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return iso }
}

export default function AboutModal({ onClose }) {
  const [confirming, setConfirming] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const answered = countAnswered(loadProgress())

  // 開啟即視為「已看過此版本」(清除首頁紅點)
  useEffect(() => { markVersionSeen() }, [])
  // 預先編好備份碼,讓「複製」能在點擊當下同步取用
  useEffect(() => {
    if (!confirming) return
    let on = true
    encodeProgress(loadProgress()).then((c) => { if (on) setCode(c) })
    return () => { on = false }
  }, [confirming])

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setMsg('已複製備份碼') }
    catch { setMsg('複製失敗,請改用下載') }
  }
  const download = async () => { await downloadBackup(loadProgress()); setMsg('已下載備份檔') }
  const doRefresh = async () => { setRefreshing(true); await forceRefresh() }

  // 刷新前先提醒備份(與「立即更新」一致)
  if (confirming) {
    return (
      <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal update-modal" role="dialog" aria-modal="true" aria-label="刷新前提醒">
          <h2 className="modal-title">刷新前先備份答題記錄</h2>
          <div className="modal-body">
            <p className="disc-lead">
              「刷新到最新版」會清除快取並重新載入。建議先<strong>匯出答題記錄</strong>備份;
              萬一紀錄不見可用「匯入進度」一鍵還原。
              {answered > 0 ? `目前共 ${answered} 題作答紀錄。` : '目前尚無作答紀錄。'}
            </p>
            <div className="backup-btns">
              <button className="mode-btn" onClick={copyCode} disabled={answered === 0 || !code}>複製備份碼</button>
              <button className="mode-btn" onClick={download} disabled={answered === 0}>下載備份檔</button>
            </div>
            {msg && <p className="backup-msg">{msg}</p>}
          </div>
          <div className="modal-actions update-modal-actions">
            <button className="mode-btn primary" onClick={doRefresh} disabled={refreshing}>
              {refreshing ? '刷新中…' : '確定刷新'}
            </button>
            <button className="mode-btn" onClick={() => setConfirming(false)}>取消</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="版本與更新">
        <h2 className="modal-title">版本與更新</h2>
        <p className="modal-updated">
          目前版本 <strong>v{APP_VERSION}</strong>・建置 {fmtBuild(BUILD_TIME)}・{GIT_SHA}
        </p>

        <div className="modal-actions" style={{ marginTop: 0, marginBottom: 4 }}>
          <button className="mode-btn primary" onClick={() => setConfirming(true)}>
            🔄 刷新到最新版
          </button>
        </div>
        <p className="about-hint">
          若覺得內容沒更新到,按上面的按鈕會清除快取並重新載入最新版(會先提醒你備份答題記錄)。
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
