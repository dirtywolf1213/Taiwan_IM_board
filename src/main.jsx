import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import UpdatePrompt from './components/UpdatePrompt.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* 一律掛載:負責註冊 service worker 並在有新版時提示更新 */}
    <UpdatePrompt />
  </React.StrictMode>,
)
