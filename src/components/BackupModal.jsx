import { useEffect, useState } from 'react'
import { encodeProgress, decodeProgress, countAnswered } from '../lib/backup.js'

// mode: 'export' | 'import'
// export: 顯示備份碼(可複製 / 下載檔案)
// import: 貼上備份碼或選檔,套用後取代現有進度
export default function BackupModal({ mode, progress, onApply, onClose }) {
  const isExport = mode === 'export'
  const [code, setCode] = useState('')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // 備份碼以非同步方式產生(含 gzip 壓縮)
  useEffect(() => {
    if (!isExport) return
    let on = true
    encodeProgress(progress).then((c) => { if (on) setCode(c) })
    return () => { on = false }
  }, [isExport, progress])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setMsg('已複製到剪貼簿')
    } catch {
      setMsg('無法自動複製,請長按上方文字手動複製')
    }
  }

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `內科刷題進度_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result || ''))
    reader.readAsText(f)
  }

  const apply = async () => {
    setErr('')
    let p
    try {
      p = await decodeProgress(text)
    } catch (e) {
      setErr(e.message)
      return
    }
    const n = countAnswered(p)
    if (!confirm(`將以匯入的進度(${n} 題作答紀錄)取代目前裝置上的紀錄,確定?`)) return
    onApply(p)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label="進度備份">
        <h2 className="modal-title">{isExport ? '匯出進度（備份）' : '匯入進度（還原）'}</h2>
        <div className="modal-body">
          {isExport ? (
            <>
              <p className="disc-lead">
                複製下方備份碼或下載檔案保存。換裝置 / 清快取後,用「匯入進度」貼回即可還原。
                目前共 {countAnswered(progress)} 題作答紀錄。
              </p>
              <textarea className="backup-area" readOnly value={code} placeholder="備份碼產生中…" onFocus={(e) => e.target.select()} />
              <div className="backup-btns">
                <button className="mode-btn" onClick={copy} disabled={!code}>複製備份碼</button>
                <button className="mode-btn" onClick={download} disabled={!code}>下載檔案</button>
              </div>
              {msg && <p className="backup-msg">{msg}</p>}
            </>
          ) : (
            <>
              <p className="disc-lead">
                貼上備份碼,或選擇先前下載的備份檔。匯入會「取代」目前裝置上的作答紀錄。
              </p>
              <textarea
                className="backup-area"
                placeholder="在此貼上備份碼…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="backup-btns">
                <label className="mode-btn file-label">
                  選擇備份檔
                  <input type="file" accept=".txt,.json,text/plain,application/json" onChange={onFile} hidden />
                </label>
                <button className="mode-btn primary" onClick={apply} disabled={!text.trim()}>匯入</button>
              </div>
              {err && <p className="backup-err">⚠️ {err}</p>}
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="mode-btn" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}
