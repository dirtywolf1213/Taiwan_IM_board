import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { letter, subjectColor } from '../lib/util.js'

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

// 顯示一題:題幹、(附圖)、選項。
// props:
//   q          題目物件
//   chosen     已選的選項 index(null 表示未作答)
//   revealed   是否顯示正解與詳解(練習模式作答後 / 模擬考檢討時)
//   onChoose   選擇選項的 callback(index)
//   index/total 進度顯示
export default function QuestionView({ q, chosen, revealed, onChoose, index, total }) {
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
        </span>
        <span>{index + 1} / {total}</span>
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
          const isAnswer = q.answer === i
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
            <span className={chosen === q.answer ? 'tag ok' : 'tag ng'}>
              {chosen === q.answer ? '答對' : '答錯'}
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
                <ReactMarkdown>{q.explanation}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
