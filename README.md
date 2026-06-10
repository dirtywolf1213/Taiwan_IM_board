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

### 版本與更新提示

App 採**提示式更新**(PWA `registerType: 'prompt'`):偵測到新版時,畫面下方會跳一條
「🆕 有新版本可用」橫幅,使用者按「立即更新」才會套用並重載(不再背景強制換版)。
另外每 30 分鐘、以及切回分頁時會自動檢查一次更新。

- 首頁頁尾有「**版本 vX.Y.Z・更新紀錄**」按鈕,點開 `AboutModal` 可看目前版本、build 時間、
  git commit,以及**更新紀錄**;有未看過的新版本時按鈕會顯示紅點。
- 內含「**🔄 刷新到最新版**」按鈕:清除快取後重新載入(保底用,確保拿到最新檔案)。
- 版本號**單一真實來源 = `src/data/changelog.json` 第一筆的 `version`**;`vite.config.js` 於
  build 時把版本/時間/commit 以 `__APP_VERSION__` 等注入(見 `src/lib/version.js`)。
- **維護原則(重要):每次有使用者看得到的更動,要「三件事一起改」** ——
  ① `src/data/changelog.json` 最前面新增一筆(`version`/`date`/`items[]`,版本號遞增);
  ② `src/components/UserManual.jsx` 同步把新功能的用法寫進「使用說明」;
  ③ 本 README 更新說明與「現況」清單。詳見 [`CLAUDE.md`](./CLAUDE.md)。

### 匯出 / 分享(題目＋詳解)

做題頁可一鍵匯出題目與詳解,方便貼給其他 AI 提問或分享給他人(元件:`src/components/ExportMenu.jsx`,
邏輯:`src/lib/exportContent.js`,以動態 import 載入避免拖慢首屏):

- **單題**:作答後在詳解下方有「⬇ 匯出本題」。
- **整回合**:練習頁進度列右側有「⬇ 匯出(N)」,匯出本回合全部題目。
- 三種格式:**複製 Markdown**(貼給其他 AI 最佳)、**下載 .md**、**匯出 PDF**(用列印視窗,
  文字可選取、附圖內嵌、PMID/DOI 連結可點;有附圖的題目建議用 PDF)。
- 匯出內容會附上來源、版本與免責聲明頁尾。

### 部署到 Cloudflare Pages / Workers

除 GitHub Pages 外亦可部署到 Cloudflare。重點:

- **build 指令 `npm run build`、輸出目錄 `dist`、不要設 `BASE_PATH`**(根網域 base 須為 `/`;
  只有 GitHub Pages 子路徑那份才需要 `/Taiwan_IM_board/`)。
- `public/_headers` 已設定快取規則:`index.html`/`sw.js`/`manifest` 不長期快取(才能即時偵測新版)、
  `assets/*` 長期不可變快取。Vite 會把 `public/` 原樣複製到 `dist/`,Cloudflare Pages/Workers 靜態資源皆適用。

### 重新產生題庫 JSON

把 PDF 放進 `source-pdfs/` 後執行轉檔工具：

```bash
python3 tools/parse_pdf.py source-pdfs/考題_114.pdf --year 114 --out src/data/questions.114.json
```

題庫採**輕量索引 + 依年份動態載入**:`src/data/index.json`(僅 id/year/num/subject,eager)供首頁統計與各科/各年題數即時顯示;各年題目內容(`questions.<年>.json`)由 `src/data/questions.js` **按需動態載入**(Vite 切成各自 chunk)。新增/修改題庫後務必重跑索引:

```bash
python3 tools/build_index.py    # 重建 src/data/index.json(validate 會檢查是否同步)
```

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
- [x] 全題庫詳解：104–114 共 11 年、2000 題,每題五段式 v2 詳解(逐選項分析＋查證過的 PMID/DOI)
- [x] App 內版本/更新提示(提示式更新＋更新紀錄＋一鍵刷新最新版)
- [x] 做題頁一鍵匯出/分享(複製 Markdown / 下載 .md / 匯出 PDF,含附圖)
- [x] Cloudflare Pages/Workers 部署支援(`public/_headers` 快取規則)
- [x] 參考資料 PMID/DOI 可點擊連結;逐年嚴格審核詳解(最新版指引、查證 PMID)
- [x] 題目收藏 ★、個人筆記 📝、間隔複習(到期複習)、學習統計與 PDF 報告、深色模式
- [x] 進度備份壓縮(gzip)、更新/刷新前提醒匯出備份
- [x] 練習頁「跳題」格永久標記已作答題目(含歷史紀錄,綠=答對/紅=答錯)
- [x] 全題庫搜尋 🔍(題幹/選項/題號/科目/考點);考點分類(試點:心臟血管,依科目練習可按考點次篩選)
