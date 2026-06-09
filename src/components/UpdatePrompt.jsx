import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { loadProgress } from '../lib/storage.js'
import { encodeProgress, downloadBackup, countAnswered } from '../lib/backup.js'

// 提示式更新:偵測到新版時跳一條橫幅。按「立即更新」會先提醒匯出答題記錄,
// 確認後才套用並重載。另每 30 分鐘、切回分頁時主動檢查更新。
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return
      setInterval(() => { r.update().catch(() => {}) }, 30 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') r.update().catch(() => {})
      })
    },
  })

  const [confirming, setConfirming] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const answered = countAnswered(loadProgress())

  // 先把備份碼編好,讓「複製」能在點擊當下同步取用(避免 Safari 失去使用者手勢)
  useEffect(() => {
    if (!needRefresh) return
    let on = true
    encodeProgress(loadProgress()).then((c) => { if (on) setCode(c) })
    return () => { on = false }
  }, [needRefresh])

  if (!needRefresh) return null

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setMsg('已複製備份碼') }
    catch { setMsg('複製失敗,請改用下載') }
  }
  const download = async () => { await downloadBackup(loadProgress()); setMsg('已下載備份檔') }

  // 第一步:更新提示橫幅
  if (!confirming) {
    return (
      <div className="update-banner" role="alert">
        <span className="update-text">🆕 有新版本可用</span>
        <div className="update-actions">
          <button className="update-go" onClick={() => setConfirming(true)}>立即更新</button>
          <button className="update-skip" onClick={() => setNeedRefresh(false)}>稍後</button>
        </div>
      </div>
    )
  }

  // 第二步:更新前提醒先匯出答題記錄(可複製或下載)
  return (
    <div className="modal-backdrop">
      <div className="modal update-modal" role="dialog" aria-modal="true" aria-label="更新前提醒">
        <h2 className="modal-title">更新前先備份答題記錄</h2>
        <div className="modal-body">
          <p className="disc-lead">
            建議在更新前先<strong>匯出答題記錄</strong>。萬一更新後紀錄沒了,可用「匯入進度」一鍵還原。
            {answered > 0 ? `目前共 ${answered} 題作答紀錄。` : '目前尚無作答紀錄。'}
          </p>
          <div className="backup-btns">
            <button className="mode-btn" onClick={copyCode} disabled={answered === 0 || !code}>複製備份碼</button>
            <button className="mode-btn" onClick={download} disabled={answered === 0}>下載備份檔</button>
          </div>
          {msg && <p className="backup-msg">{msg}</p>}
        </div>
        <div className="modal-actions update-modal-actions">
          <button className="mode-btn primary" onClick={() => updateServiceWorker(true)}>確定更新</button>
          <button className="mode-btn" onClick={() => { setConfirming(false); setNeedRefresh(false) }}>稍後再更新</button>
        </div>
      </div>
    </div>
  )
}
