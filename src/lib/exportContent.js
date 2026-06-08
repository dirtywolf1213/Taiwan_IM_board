import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import { letter, correctSet } from './util.js'
import { APP_VERSION } from './version.js'

// 圖片相對路徑 → 絕對網址(分享/PDF 用,確保在他處也能載入)
function absImageUrl(image) {
  if (!image) return ''
  try { return new URL(import.meta.env.BASE_URL + image, window.location.href).href }
  catch { return import.meta.env.BASE_URL + image }
}

function siteUrl() {
  try { return new URL(import.meta.env.BASE_URL, window.location.href).href }
  catch { return window.location.origin }
}

// 正解字母(支援送分/多答案;優先用題庫既有的 answerLetter 字串)
function answerLetters(q) {
  if (q.answerLetter) return q.answerLetter
  return correctSet(q).map((i) => letter(i)).join('、')
}

const DRAFT_NOTE = '(草稿,未經審核)'
const FOOT = (n) =>
  `---\n來源:內科專科考試刷題(${APP_VERSION})・${siteUrl()}\n` +
  `共 ${n} 題・本內容僅供考試學習,非官方、非臨床決策依據,正確性請以醫學會與官方公告為準。`

// ── Markdown(給其他 AI / 純文字分享) ──────────────────────────────
export function questionToMarkdown(q) {
  const lines = []
  lines.push(`### ${q.year} 年 第 ${q.num} 題（${q.subject || '未分類'}）`)
  lines.push('')
  lines.push(q.question)
  if (q.needsImage) {
    lines.push('')
    lines.push(q.image ? `> 📷 本題附圖:${absImageUrl(q.image)}` : '> 📷 本題有附圖(此處未含圖)')
  }
  lines.push('')
  q.options.forEach((opt, i) => lines.push(`(${letter(i)}) ${opt}`))
  lines.push('')
  lines.push(`**正解:${answerLetters(q)}**`)
  lines.push('')
  lines.push(`#### 詳解${q.explanationStatus && q.explanationStatus !== 'reviewed' ? DRAFT_NOTE : ''}`)
  lines.push(q.explanation ? q.explanation : '(尚無詳解)')
  return lines.join('\n')
}

export function questionsToMarkdown(list) {
  const body = list.map(questionToMarkdown).join('\n\n---\n\n')
  return `${body}\n\n${FOOT(list.length)}\n`
}

// ── 複製 / 下載 ────────────────────────────────────────────────────
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 後備:textarea + execCommand
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
}

export function downloadText(filename, text, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── PDF(用列印視窗,文字可選取、附圖內嵌、連結可點) ─────────────────
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

const mdToHtml = (md) => renderToStaticMarkup(createElement(ReactMarkdown, null, md || ''))

function questionToHtml(q) {
  const opts = q.options.map((opt, i) =>
    `<li><b>(${letter(i)})</b> ${escapeHtml(opt)}</li>`).join('')
  const img = q.needsImage && q.image
    ? `<div class="img"><img src="${escapeHtml(absImageUrl(q.image))}" alt="附圖" /></div>`
    : (q.needsImage ? '<div class="note">📷 本題有附圖(此處未含圖)</div>' : '')
  const draft = q.explanationStatus && q.explanationStatus !== 'reviewed'
    ? ' <span class="draft">草稿・未經審核</span>' : ''
  const expl = q.explanation
    ? `<div class="expl"><h4>詳解${draft}</h4>${mdToHtml(q.explanation)}</div>`
    : ''
  return `<article>
    <h3>${q.year} 年 第 ${q.num} 題 <span class="subj">${escapeHtml(q.subject || '')}</span></h3>
    <p class="stem">${escapeHtml(q.question)}</p>
    ${img}
    <ol class="opts">${opts}</ol>
    <p class="ans">正解:<b>${escapeHtml(answerLetters(q))}</b></p>
    ${expl}
  </article>`
}

export function exportPDF(list, title = '內科專科考試刷題') {
  const articles = list.map(questionToHtml).join('\n')
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
    color:#1f2937; line-height:1.7; font-size:13px; margin:0; padding:16px; }
  h1 { font-size:18px; margin:0 0 4px; }
  .meta { color:#6b7280; font-size:12px; margin:0 0 16px; }
  article { padding:14px 0; border-top:1px solid #e5e7eb; break-inside:avoid; }
  article:first-of-type { border-top:none; }
  h3 { font-size:15px; margin:0 0 6px; color:#0f766e; }
  .subj { font-size:12px; color:#fff; background:#0f766e; border-radius:6px; padding:1px 7px; margin-left:6px; }
  .stem { margin:0 0 8px; white-space:pre-wrap; }
  .opts { margin:0 0 8px; padding-left:0; list-style:none; }
  .opts li { margin:2px 0; }
  .ans { margin:6px 0; }
  .img { margin:8px 0; } .img img { max-width:100%; height:auto; border:1px solid #e5e7eb; border-radius:6px; }
  .note { color:#92400e; background:#fef3c7; padding:6px 10px; border-radius:6px; font-size:12px; }
  .expl { margin-top:8px; padding:10px 12px; background:#f8fafc; border-left:3px solid #0f766e; border-radius:6px; }
  .expl h4 { margin:0 0 6px; font-size:13px; }
  .expl h3 { font-size:13px; color:#0f766e; margin:10px 0 4px; }
  .draft { font-size:11px; color:#b45309; background:#fef3c7; border-radius:6px; padding:0 6px; }
  .expl :is(p,li) { margin:3px 0; } .expl blockquote { margin:6px 0; padding:4px 10px; border-left:3px solid #cbd5e1; color:#475569; }
  a { color:#0369a1; word-break:break-all; }
  footer { margin-top:18px; padding-top:10px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:11px; }
  .toolbar { position:sticky; top:0; background:#fff; padding:8px 0; }
  .toolbar button { font-size:14px; padding:8px 16px; border:none; border-radius:8px; background:#0f766e; color:#fff; cursor:pointer; }
  @media print { .toolbar { display:none; } body { padding:0; } }
</style></head><body>
  <div class="toolbar"><button onclick="window.print()">列印 / 存成 PDF</button></div>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">共 ${list.length} 題・${escapeHtml(siteUrl())}・版本 ${escapeHtml(APP_VERSION)}</p>
  ${articles}
  <footer>本內容僅供考試學習,非官方、非臨床決策依據;考試範圍與答案請以醫學會及官方公告為準。</footer>
  <script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print()}catch(e){}},400)})</script>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) { alert('請允許彈出視窗,才能匯出 PDF。'); return false }
  w.document.open(); w.document.write(html); w.document.close()
  return true
}

// 檔名:單題用 年-題號,多題用 範圍
export function exportFilename(list, ext) {
  if (list.length === 1) return `${list[0].year}-${String(list[0].num).padStart(3, '0')}.${ext}`
  return `內科刷題_${list.length}題.${ext}`
}
