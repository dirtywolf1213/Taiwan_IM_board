import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// 提示式更新:偵測到新版時跳一條橫幅,使用者按「立即更新」才套用並重載。
// 另外每 30 分鐘、以及切回分頁時,主動檢查一次更新。
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return
      setInterval(() => { r.update().catch(() => {}) }, 30 * 60 * 1000)
      const onVis = () => { if (document.visibilityState === 'visible') r.update().catch(() => {}) }
      document.addEventListener('visibilitychange', onVis)
    },
  })

  useEffect(() => () => {}, [])

  if (!needRefresh) return null

  return (
    <div className="update-banner" role="alert">
      <span className="update-text">🆕 有新版本可用</span>
      <div className="update-actions">
        <button className="update-go" onClick={() => updateServiceWorker(true)}>立即更新</button>
        <button className="update-skip" onClick={() => setNeedRefresh(false)}>稍後</button>
      </div>
    </div>
  )
}
