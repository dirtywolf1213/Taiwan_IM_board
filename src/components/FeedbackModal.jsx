import { useState } from 'react'
import { APP_VERSION } from '../lib/version.js'

// 許願池 / 意見反應:純前端,用 mailto 開啟使用者的郵件 App 寄給製作人。
// 另提供「複製內容」當保險(桌機無郵件 App 時可貼到 email/LINE)。
const TO = 'dirtywolf1213@gmail.com'

export default function FeedbackModal({ init, onClose }) {
  const [type, setType] = useState(init?.type || 'wish') // wish | report
  const [qid, setQid] = useState(init?.qid || '')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [copied, setCopied] = useState(false)

  const buildBody = () => {
    const L = []
    L.push(type === 'report' ? '類型:回報題目問題' : '類型:許願 / 功能建議')
    if (type === 'report') L.push(`題號:${qid.trim() || '(未填)'}`)
    L.push('—')
    L.push(content.trim() || '(內容)')
    if (contact.trim()) L.push(`\n聯絡方式:${contact.trim()}`)
    L.push('\n— 以下為系統自動附帶 —')
    L.push(`App 版本:v${APP_VERSION}`)
    L.push(`來源:${location.href}`)
    return L.join('\n')
  }
  const subject = type === 'report'
    ? `[內科刷題・回報] ${qid.trim()}`.trim()
    : '[內科刷題・許願]'

  const sendMail = () => {
    const url = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildBody())}`
    window.location.href = url
  }
  const copyText = () => {
    const txt = `寄給:${TO}\n主旨:${subject}\n\n${buildBody()}`
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(done, done)
    else { try { prompt(`複製以下內容,寄給 ${TO}:`, txt) } catch { /* ignore */ } done() }
  }
  const canSend = content.trim().length > 0

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="許願 / 意見反應">
        <h2 className="modal-title">💡 許願池 / 意見反應</h2>
        <p className="modal-updated">想要的新功能、或哪一題有問題,都可以告訴我</p>
        <div className="modal-body">
          <div className="fb-tabs">
            <button className={`fb-tab ${type === 'wish' ? 'on' : ''}`} onClick={() => setType('wish')}>💡 許願功能</button>
            <button className={`fb-tab ${type === 'report' ? 'on' : ''}`} onClick={() => setType('report')}>⚠️ 回報題目問題</button>
          </div>

          {type === 'report' && (
            <label className="fb-field">
              <span>題號</span>
              <input className="fb-input" value={qid} onChange={(e) => setQid(e.target.value)} placeholder="例如 114-001" />
            </label>
          )}

          <label className="fb-field">
            <span>{type === 'report' ? '問題說明' : '想要的功能 / 建議'}</span>
            <textarea
              className="note-area"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'report'
                ? '這題哪裡怪?例如:正解應該是 C、選項 B 敘述有誤、附圖看不清楚…'
                : '你希望增加什麼功能?越具體越好(例如:想要按難度篩選、想要匯出錯題本…)'}
            />
          </label>

          <label className="fb-field">
            <span>聯絡方式(選填)</span>
            <input className="fb-input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email / LINE,想回覆你時用" />
          </label>

          <p className="fb-note">
            按「送出」會開啟你的<b>郵件 App</b>(內容已填好)寄到 <b>{TO}</b>。
            若沒跳出郵件(常見於電腦),改按「複製內容」,貼到 email 或 LINE 傳給我即可。
          </p>
        </div>
        <div className="modal-actions update-modal-actions">
          <button className="mode-btn primary" onClick={sendMail} disabled={!canSend}>✉️ 送出(開啟郵件)</button>
          <button className="mode-btn" onClick={copyText} disabled={!canSend}>{copied ? '✓ 已複製' : '📋 複製內容'}</button>
          <button className="mode-btn" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}
