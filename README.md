# 內科專科考試刷題網頁 (Taiwan IM Board Exam Prep)

專門給台灣內科住院醫師準備**內科專科醫師甄審**的刷題網頁，可在手機、平板、電腦上使用。

**製作人:dirtywolf1213**

> ⚠️ **免責聲明(重要)**：本服務為**非官方、個人非營利**之學習工具，**與台灣內科醫學會等任何官方機構無任何關聯或背書**。所收錄之題目與答案均來自**醫學會公開於網路之公開資料**，其著作權及智慧財產權**均歸原權利人(台灣內科醫學會或其授權人)所有**，本服務不主張任何權利、不保證內容正確性、亦不作為醫療或考試之依據。若權利人不同意收錄，將立即移除或下架。完整內容請見 **[DISCLAIMER.md](./DISCLAIMER.md)**。

---

## 目標

- 跨裝置（手機 / 平板 / 電腦）皆可使用的刷題工具
- 題庫來源：**台灣內科醫學會公開題庫 + 答案**
- 使用對象：**自用 + 小團體，不公開**
- 介面：**繁體中文為主，專業名詞保留英文**（符合台灣醫界使用習慣，例如 Hb、CKD、ACS、ECG 不硬翻）

## 功能規劃

### MVP（第一版，求堪用）
- [ ] 科目分類（Cardiology、Nephrology、Infectious Disease、Hematology/Oncology、Pulmonology、GI、Endocrinology、Rheumatology、General Medicine…）
- [ ] 隨機 / 順序刷題
- [ ] 單選題作答、即時對答案
- [ ] 圖片顯示（ECG / X-ray / 病理切片，可放大）
- [ ] 錯題本、答題記錄
- [ ] 依年份 / 科目篩選與搜尋
- [ ] RWD 響應式 + PWA（可加到主畫面、可離線）

### 第二階段（視需求）
- [ ] 模擬考模式（計時、固定題數、交卷計分）
- [ ] 各科正確率統計、弱點分析
- [ ] 題目收藏、筆記
- [ ] 詳解欄位（之後逐步補充）

## 技術架構

純前端、無後端、零維運成本：

| 層面 | 選用 |
|---|---|
| 前端框架 | React + Vite |
| UI | Tailwind CSS |
| 型態 | PWA（可離線、可安裝） |
| 題庫儲存 | JSON 檔案打包進專案 |
| 作答進度 | 瀏覽器 localStorage（各裝置各自儲存） |
| 部署 | Vercel / Netlify（免費，給小團體一個共用網址） |

> 小團體共用方式：**共用同一個網址**，每個人在自己的裝置上刷題，進度各自存於瀏覽器、互不干擾。不需帳號、不需雲端同步。

## 題庫資料格式（規劃中）

每題為一個 JSON 物件：

```json
{
  "id": "2023-cardio-012",
  "year": 2023,
  "subject": "Cardiology",
  "question": "65 y/o male with chest pain, ECG 如圖。最可能的診斷？",
  "image": "images/2023-012-ecg.png",
  "options": ["STEMI", "NSTEMI", "Pericarditis", "Aortic dissection"],
  "answer": 0,
  "explanation": ""
}
```

- `answer`：正確選項的索引（0 起算）
- `image`：可選，無圖則省略
- `explanation`：可選，醫學會通常只給答案，詳解可日後補

## 開發路線

- **Phase 0（驗證）**：用一份真實 PDF（某一年題目 + 答案）跑通「PDF → JSON → 網頁顯示」整條流程，做出可刷該年題目的雛形。
- **Phase 1（MVP）**：完成上方 MVP 功能、部署上線。
- **Phase 2**：視需求加入模擬考、統計等。

### 核心難點：PDF → JSON 轉檔

醫學會題庫為 PDF，最大工作量在轉檔：

1. PDF 文字抽取常需人工校對（排版、換行、跨頁題目）
2. 圖片需抽出並正確對應題號（醫學影像關係到答題，寧慢求準）
3. 答案卷需與題目以題號合併

採**半自動流程**：程式抽取文字 + 圖片 → 產生草稿 JSON → 人工 / AI 校對 → 正式題庫。

## 題目與圖檔的存放慣例

每個年度一個資料夾,放在 `source-pdfs/<年>/`：

```
source-pdfs/
└── 114/
    ├── 考題_114.pdf     # 題目(答案內嵌於題首 [X])
    ├── 圖_114-1.pdf     # 附圖,以「第 N 題」標記
    └── 圖_114-2.pdf
```

> 注意：本 repo 為私有、不公開。放入前仍請留意醫學會題庫的使用條款是否限制再散布。

---

## 開發與執行

```bash
npm install        # 安裝相依套件
npm run dev        # 本機開發(http://localhost:5173)
npm run build      # 打包到 dist/
npm run preview    # 預覽打包結果
npm run validate   # 驗證題庫資料(python3 tools/validate.py)
```

### 題庫驗證

新增 / 修改題庫後,建議執行 `npm run validate`(或 `python3 tools/validate.py`)。會檢查:
必要欄位、選項數=5、`answer`/`answerLetter` 一致、`subject` 屬 11 科、題號連續不重複、
`image` 檔案存在等;有錯誤回傳非 0,可接入 CI / SessionStart hook。

### 題目詳解

詳解與題庫**解耦**,放在獨立檔 `src/data/explanations.<年>.json`(以題目 id 為 key),
載入時自動合併;重跑轉檔不會覆寫詳解。格式:

```json
{ "114-001": { "text": "**正解:C** …(支援 Markdown)", "status": "reviewed" } }
```

- `status` 非 `reviewed`(預設草稿)時,App 會在詳解標示「草稿・未經審核」。
- 詳解內容以 AI 起草、由醫師審核定稿為原則;`npm run validate` 會報告各年覆蓋率。
- 可漸進補充,App 僅對「有內容」的題目顯示詳解。
- **撰寫格式一律遵循 [docs/詳解撰寫規範.md](./docs/詳解撰寫規範.md)**(固定五段式:本題觀念 / 選項分析 / 答案解析 / 核心知識點 / 參考資料)。範例見 `explanations.114.json` 的 `114-001`。
- 用 AI 協助量產詳解的**操作手冊與現成指令**見 [docs/AI寫詳解教學與指令.md](./docs/AI寫詳解教學與指令.md);可用 `python3 tools/export_questions.py --year <年> [--subject <科>]` 匯出待寫題目餵給 AI。

### 進度備份

App 首頁提供「匯出進度 / 匯入進度」(備份碼或檔案)。作答紀錄僅存於本機 localStorage,
換裝置 / 清快取前可自行匯出備份、之後匯入還原(非雲端同步)。

部署到 GitHub Pages 等子路徑時,設定 `BASE_PATH` 環境變數,例如：
`BASE_PATH=/Taiwan_IM_board/ npm run build`

### 重新產生題庫 JSON

把 PDF 放進 `source-pdfs/` 後執行轉檔工具：

```bash
python3 tools/parse_pdf.py source-pdfs/考題_114.pdf --year 114 --out src/data/questions.114.json
```

`src/data/questions.js` 會自動載入 `questions.*.json`,新增年份只要再跑一次轉檔即可。

### 裁切並接上附圖

附圖 PDF 以「第 N 題」標記。各題的裁切框已在 `tools/extract_figures.py` 的 `LAYOUT`
表中對照核對(新增年份時依該年版面新增一組座標),執行後會把圖切成 PNG 存到
`public/images/<年>/<題號>.png`,並自動回填對應題目的 `image` 欄位：

```bash
python3 tools/extract_figures.py --year 114
```

## 現況

- [x] 需求與架構規劃
- [x] 取得第一份真實 PDF（114 年,160 題,答案內嵌於題目）
- [x] PDF → JSON 轉檔工具（`tools/parse_pdf.py`）
- [x] 刷題前端 MVP：順序/隨機練習、錯題複習、模擬考計時計分、PWA 可安裝
- [x] 接上 114 年 14 題附圖（`tools/extract_figures.py`）
- [x] 113 年題庫（160 題，含 8 題附圖）
- [x] 題目科目分類（11 科，`tools/classify.py`，規律與判斷題清單見 [docs/題目分類說明.md](./docs/題目分類說明.md)）+ 依科目練習
- [x] 部署上線（GitHub Pages，push 自動部署）
