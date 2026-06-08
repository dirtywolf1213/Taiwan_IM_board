import { useEffect, useRef, useState } from 'react'

// 可重用的「匯出/分享」選單。
// 匯出邏輯(含 react-dom/server)以動態 import 載入,避免拖累首屏載入。
// props:
//   questions  要匯出的題目陣列(單題就傳一個元素)
//   label      按鈕文字(預設「匯出/分享」)
//   compact    小尺寸樣式(用在單題工具列)
export default function ExportMenu({ questions, label = '匯出 / 分享', compact = false }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const ref = useRef(null)
  const list = questions || []

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800) }
  const lib = () => import('../lib/exportContent.js')

  const doCopy = async () => {
    setOpen(false)
    const { questionsToMarkdown, copyText } = await lib()
    const ok = await copyText(questionsToMarkdown(list))
    flash(ok ? '已複製到剪貼簿' : '複製失敗,請改用下載')
  }
  const doDownload = async () => {
    setOpen(false)
    const { questionsToMarkdown, downloadText, exportFilename } = await lib()
    downloadText(exportFilename(list, 'md'), questionsToMarkdown(list))
    flash('已下載 .md')
  }
  const doPDF = async () => {
    setOpen(false)
    const { exportPDF } = await lib()
    const title = list.length === 1
      ? `${list[0].year} 年 第 ${list[0].num} 題`
      : `內科刷題 ${list.length} 題`
    exportPDF(list, title)
  }

  if (list.length === 0) return null

  return (
    <div className={`export-menu ${compact ? 'compact' : ''}`} ref={ref}>
      <button className="export-btn" onClick={() => setOpen((v) => !v)}>
        ⬇ {label}{list.length > 1 ? `(${list.length})` : ''}
      </button>
      {open && (
        <div className="export-pop" role="menu">
          <button onClick={doCopy}>📋 複製 Markdown<small>貼給其他 AI / 訊息最方便</small></button>
          <button onClick={doDownload}>📄 下載 .md<small>純文字檔</small></button>
          <button onClick={doPDF}>🖨 匯出 PDF<small>含附圖,適合分享 / 列印</small></button>
        </div>
      )}
      {toast && <span className="export-toast">{toast}</span>}
    </div>
  )
}
