import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { letter, subjectColor, isCorrect } from '../lib/util.js'
import ExportMenu from './ExportMenu.jsx'

// 詳解內參考資料的連結:一律新分頁開啟,方便使用者點開查證原文。
const LinkNewTab = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
)

// 附圖:切題時用 key 強制換新元素(避免顯示上一題的舊圖),載入中顯示佔位。
function FigureImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(false) }, [src])
  return (
    <div className="q-image-wrap">
      {!loaded && <div className="q-image-loading"><span className="spinner" /></div>}
      <img
        key={src}
        className="q-image"
        src={src}
        alt={alt}
        decoding="async"
        style={loaded ? undefined : { display: 'none' }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  )
}

// 個人筆記編輯器:切題時自動載入該題筆記,輸入即存(失焦時寫入)。
function NoteEditor({ id, note, onSetNote }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(note || '')
  useEffect(() => { setText(note || ''); setOpen(!!note) }, [id, note])
  const save = () => { if ((text || '') !== (note || '')) onSetNote(id, text) }
  return (
    <div className="note-block">
      <button className="note-toggle" onClick={() => setOpen((v) => !v)}>
        📝 我的筆記{note ? ' ●' : ''} {open ? '▲' : '▼'}
      </button>
      {open && (
        <textarea
          className="note-area"
          placeholder="寫下自己的筆記、口訣、易錯點…(只存在本機,會跟著備份)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
        />
      )}
    </div>
  )
}

// 顯示一題:題幹、(附圖)、選項。
// props:
//   q          題目物件
//   chosen     已選的選項 index(null 表示未作答)
//   revealed   是否顯示正解與詳解(練習模式作答後 / 模擬考檢討時)
//   onChoose   選擇選項的 callback(index)
//   index/total 進度顯示
//   favorited / onToggleFav   收藏狀態與切換
//   note / onSetNote          個人筆記
export default function QuestionView({
  q, chosen, revealed, onChoose, index, total,
  favorited, onToggleFav, note, onSetNote,
}) {
  const [copied, setCopied] = useState(false)
  const copyLink = () => {
    const base = import.meta.env.BASE_URL || '/'
    const url = `${window.location.origin}${base}#q=${q.id}`
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, done)
    else { try { prompt('複製這題的連結:', url) } catch { /* ignore */ } done() }
  }
  return (
    <div className="card">
      <div className="q-meta">
        <span>
          {q.year} 年・第 {q.num} 題
          {q.subject && (
            <span
              className="subject-chip"
              style={{ color: subjectColor(q.subject), background: `${subjectColor(q.subject)}1f` }}
            >
              {q.subject}
            </span>
          )}
          {q.topic && <span className="topic-chip" title="考點">{q.topic}</span>}
        </span>
        <span className="q-meta-right">
          {onToggleFav && (
            <button
              className={`fav-btn ${favorited ? 'on' : ''}`}
              onClick={() => onToggleFav(q.id)}
              aria-label={favorited ? '取消收藏' : '收藏這題'}
              title={favorited ? '取消收藏' : '收藏這題'}
            >
              {favorited ? '★' : '☆'}
            </button>
          )}
          {index + 1} / {total}
        </span>
      </div>

      <p className="q-stem">{q.question}</p>

      {q.needsImage && (
        q.image ? (
          <FigureImage src={import.meta.env.BASE_URL + q.image} alt={`第 ${q.num} 題附圖`} />
        ) : (
          <div className="q-image-missing">📷 此題有附圖,圖片尚未匯入(之後補上)</div>
        )
      )}

      <ul className="options">
        {q.options.map((opt, i) => {
          const isChosen = chosen === i
          const isAnswer = isCorrect(q, i)
          let cls = 'option'
          if (revealed) {
            if (isAnswer) cls += ' correct'
            else if (isChosen) cls += ' wrong'
          } else if (isChosen) {
            cls += ' selected'
          }
          return (
            <li key={i}>
              <button
                className={cls}
                onClick={() => onChoose(i)}
                disabled={revealed}
              >
                <span className="opt-letter">{letter(i)}</span>
                <span className="opt-text">{opt}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {revealed && (
        <div className="answer-box">
          正解:<strong>{q.answerLetter}</strong>
          {chosen != null && (
            <span className={isCorrect(q, chosen) ? 'tag ok' : 'tag ng'}>
              {isCorrect(q, chosen) ? '答對' : '答錯'}
            </span>
          )}
          {q.explanation && (
            <div className="explanation">
              <div className="explanation-head">
                詳解
                {q.explanationStatus !== 'reviewed' && (
                  <span className="expl-draft">草稿・未經審核</span>
                )}
              </div>
              <div className="explanation-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: LinkNewTab }}>{q.explanation}</ReactMarkdown>
              </div>
            </div>
          )}
          <div className="q-export-row">
            <ExportMenu questions={[q]} label="匯出本題" compact />
            <button className="q-link-btn" onClick={copyLink}>{copied ? '✓ 已複製連結' : '🔗 連結'}</button>
          </div>
        </div>
      )}

      {onSetNote && <NoteEditor id={q.id} note={note} onSetNote={onSetNote} />}
    </div>
  )
}
