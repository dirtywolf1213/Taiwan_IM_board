# CLAUDE.md — 專案指南(給協助開發的 AI)

任何 AI 接手本專案前**先完整讀本檔**。這裡集中記錄架構、慣例、以及「動到 X 必須同步改 Y」的原則。

---

## 0. 專案是什麼

台灣「**內科專科醫師甄審**」考古題刷題網頁(React 19 + Vite 7 + PWA),純前端、無後端。
題庫涵蓋 **104–114 年共 2000 題**(每年 160 或 200 題),11 科。使用者:自用 + 小團體,非公開。
線上版:GitHub Pages(`/Taiwan_IM_board/`)與 Cloudflare Worker(根網域)。

---

## 1. 最高原則(務必遵守)

- **零錯誤優先**:醫療內容寧缺勿錯。題目/答案必須與來源逐字一致;不確定的數字、試驗、PMID 一律查證或改原則性描述,**嚴禁杜撰**。
- **詳解 `status` 未經醫師審核一律 `draft`**;AI **永遠不可**自行改成 `reviewed`。
- **正解依「該考試年度當時的標準」**判定(確保使用者答對該年考題);考點若有更新,於詳解內用 `> 最新進展：` 引述塊註明,但不改考年正解。
- **非官方、非營利、非醫療建議**:所有對外文字都要與免責聲明一致。

---

## 2. 🔴 改「使用者看得到的功能」= 三件事一起改

每當有使用者看得到的更動(新功能 / UI 變動 / 行為改變 / 重要修正),同一變更要同步更新:

1. **`src/data/changelog.json`** — 陣列**最前面**新增 `{ version, date, items[] }`,版本號依語意遞增(功能→minor、修正→patch)。這是 App 內「版本/更新紀錄」的單一真實來源。
2. **`src/components/UserManual.jsx`** — 把新功能「怎麼用」寫進對應段落,讓首頁「📖 使用說明」與實際功能一致。
3. **`README.md`** — 更新說明與最後「現況」清單。

> 簡記:**改功能 = changelog + 使用說明 + README**。

---

## 3. 技術架構與檔案地圖

| 層面 | 選用 |
|---|---|
| 框架 | React 19 + Vite 7 |
| PWA | `vite-plugin-pwa`(`registerType: 'prompt'` 提示式更新) |
| 題庫 | JSON 打包進專案,**依年份動態載入**(`import.meta.glob`) |
| 進度 | 瀏覽器 `localStorage`(各裝置各自存) |
| 樣式 | 單一 `src/styles.css`(無 Tailwind,儘管 README 早期這樣寫) |

重要檔案:
- `src/App.jsx` — 主畫面狀態機(home / subjects / years / practice / mock)、各 modal 開關。
- `src/components/` — `Home`、`Practice`、`Mock`、`QuestionView`、`SubjectPicker`、`YearPicker`、
  `SubjectStats`、`BackupModal`、`Disclaimer`、`AboutModal`(版本)、`UserManual`(使用說明)、
  `ExportMenu`(匯出)、`UpdatePrompt`(更新橫幅)。
- `src/data/questions.js` — 載入邏輯:輕量 `index.json`(eager)+ 各年 `questions.<年>.json` / `explanations.<年>.json`(動態),合併時把詳解掛到題目上。
- `src/lib/` — `util.js`(科目順序/顏色、`letter`、`correctSet`/`isCorrect`、圖片預載)、
  `storage.js`(進度存取)、`backup.js`(進度匯出/匯入編碼)、`version.js`(版本/changelog/強制刷新)、
  `exportContent.js`(題目→Markdown / 下載 / PDF)。
- `tools/` — Python 轉檔與維運腳本(見 §6)。
- `docs/` — 詳解規範與 AI 指引(見 §5)。
- `source-pdfs/<年>/` — 原始考題與附圖 PDF。

---

## 4. 資料格式

**`src/data/questions.<年>.json`**(陣列):
```json
{ "id":"114-001","year":114,"num":1,"subject":"心臟血管",
  "question":"...","options":["A內容","B內容","C內容","D內容","E內容"],
  "answer":2,"answerLetter":"C","needsImage":false,"image":"images/114/001.png" }
```
- `answer` = 正解索引(0 起);`answerLetter` = 對應字母;兩者須一致(validate 會檢查)。
- `topic`(選填)= 考點次分類(單一主考點,英文/縮寫,如 `ACS`/`HF`)。已分類科:**全 11 科 2000 題**。由 `tools/classify_topic.py` 依「題幹+選項+詳解」關鍵字自動分類(各科考點清單見該檔 `TAXO`;啟發式、可再細分)。血液腫瘤的實體癌已細分為 `Onc-Lung/Breast/CRC/GU/GI/Melanoma/GYN/NET/Sarcoma/CUP` 與 `Onc-Principles`;改動後重建 `index.json`(已含 `topic`,供 chips/搜尋免載整年)。UI:依科目練習的考點 chips、每題 badge、全題庫搜尋。
- **送分/複選題**:可有 `answers`(索引陣列),`answerLetter` 可為 `"A、C(送分)"` 這類字串 → 顯示與匯出都照字串原樣。
- `needsImage:true` 表示該題有附圖;`image` 為相對路徑(顯示時前綴 `import.meta.env.BASE_URL`)。

**`src/data/explanations.<年>.json`**(以 id 為 key,與題庫**解耦**):
```json
{ "114-001": { "text":"### 本題觀念\n…(Markdown)","status":"draft" } }
```
- `status` 非 `reviewed` 時 App 顯示「草稿・未經審核」。重跑題庫轉檔不會覆蓋詳解。

**`src/data/index.json`** — 由 `tools/build_index.py` 產生(id/year/num/subject,有分類者另含 `topic`)。改題號或考點後必須重建。
**`src/data/changelog.json`** — 版本紀錄(見 §2);第一筆的 `version` 即 App 顯示版本。

---

## 5. 詳解系統

- **格式規範**:一律遵循 [`docs/詳解撰寫規範.md`](./docs/詳解撰寫規範.md)。固定**五段式**:
  `### 本題觀念 / ### 選項分析 / ### 答案解析 / ### 核心知識點 / ### 參考資料`。
  「v2」深度 = board 級:逐選項分析(指出每個錯誤選項是哪個概念的陷阱)、可操作核心知識點
  (藥名劑量 / cutoff / 分情境決策)、參考資料附**最新版指引 + 關鍵試驗**並列出 PMID/DOI/官方網址。
- **參考資料時效規則**(§5.4):優先 2023–2026 指引;指引若未改版仍列出並標「(現行版)」;
  教科書要寫版次與年份;PMID/DOI 必須 WebSearch 查證為真,查不到就改原則性描述,不可捏造。
- **原則性更動要同步**:改了規範或標準,要同步更新
  [`docs/AI寫詳解教學與指令.md`](./docs/AI寫詳解教學與指令.md)(AI 起草指令)與
  [`docs/AI_REVIEWER_README.md`](./docs/AI_REVIEWER_README.md)(AI 審核標準)。
- **審核流程(人 + AI)**:`draft` → AI 初審 → 人工定稿(`reviewed`)。工具:
  `tools/make_review_sheet.py`(產生 `review/<科>_<年>.md`)、`inject_ai_review.py`(注入 AI 初審)、
  `apply_review_sheet.py`(人工決定入庫並蓋 `reviewedBy`/`reviewedAt`);操作手冊見 `review/README.md`。
- **品質檢核**(合併草稿前必查):五段齊全、每個選項都有分析、結論與 `answerLetter` 一致、
  無罐頭填充字句、無捏造引用。罐頭偵測字句範例:「此選項常是相近疾病」「供後續醫師逐題校閱」「以下為 AI 起草」等。

### 用 subagent 量產詳解的實戰經驗
- 一個 agent 約 **10–12 題** 最穩;混合次專科(神經+精神+皮膚)或題目特長者,**超過 ~16 題容易 stream idle timeout**,切小批。
- agent 常在 token / 每日滾動上限 / 週上限間擺盪;**多數會「寫完檔案才回報上限」**,所以失敗也先檢查 `tmp_drafts/` 有沒有產出,再決定重派。
- 流程:`tools/export_questions.py` 匯出待寫題 → 餵 agent(附 `docs/AI寫詳解教學與指令.md` + 一份範例如 `113-037` 當品質標竿)→ 驗證 → 合併進 `explanations.<年>.json` → `python3 tools/validate.py` → commit/push。

---

## 6. 題庫工具(`tools/`,皆 Python3)

| 腳本 | 用途 |
|---|---|
| `parse_pdf.py` / `parse_pdf_109.py` / `parse_pdf_old.py` | 考題 PDF → `questions.<年>.json`(不同年份版面用不同版) |
| `build_index.py` | 重建 `src/data/index.json`(改題號後必跑) |
| `classify.py` | 題目科目分類(11 科;規則見 `docs/題目分類說明.md`) |
| `classify_topic.py` | 題目「考點」次分類(單一主考點,英文縮寫;`--subject` 指定科,`--dry-run` 看分佈)。改完重建 index |
| `extract_figures.py` | 依 `LAYOUT` 裁切框把附圖 PDF 切成 PNG 存 `public/images/<年>/`,並回填 `image` 欄位 |
| `auto_figures.py` | 附圖自動關聯的輔助 |
| `export_questions.py` | 匯出「尚無詳解」題目餵 AI(`--year` / `--subject` / `--nums`) |
| `make_review_sheet.py` / `inject_ai_review.py` / `apply_review_sheet.py` | 審核流程三件套 |
| `validate.py` | 驗證題庫(必要欄位、選項=5、answer/answerLetter 一致、科目合法、題號連續、image 存在、index 同步、詳解覆蓋率) |

附圖慣例:`source-pdfs/<年>/` 放 `考題_<年>.pdf` 與 `圖_<年>*.pdf`。舊格式(104–108)標「科別第N題」,
新格式(109–114)標全域「第N題」+ 圖一/圖二。新增年份要在 `extract_figures.py` 的 `LAYOUT` 補該年座標。

---

## 7. 指令速查

```bash
npm install
npm run dev        # 本機開發 http://localhost:5173
npm run build      # 打包到 dist/
npm run preview    # 預覽打包結果
npm run validate   # = python3 tools/validate.py(題庫驗證)

python3 tools/build_index.py          # 改題號後重建索引
python3 tools/extract_figures.py --year <年>   # 裁圖+回填
python3 tools/export_questions.py --year <年> [--subject <科>]  # 匯出待寫詳解題
```

---

## 8. 部署

- **GitHub Pages**:`.github/workflows/deploy.yml`,push 到 `main` 觸發;以
  `BASE_PATH=/Taiwan_IM_board/ npm run build` 建置(子路徑)。
- **Cloudflare Worker**(根網域):`wrangler.jsonc`(`assets.directory: ./dist`、SPA 後援);
  Build command `npm run build`、Deploy command `npx wrangler deploy`、**不可設 `BASE_PATH`**
  (根網域 base 必須是 `/`,設了會讓資產 404 → 白頁)。`public/_headers` 控制快取
  (HTML/sw/manifest 不長期快取以利更新偵測;`assets/*` 不可變快取)。
- **base 機制**:`vite.config.js` 的 `base` 預設 `/`,僅 GitHub Actions 注入 `BASE_PATH`。
  `vite.config.js` 讀 changelog 取版本號、並以 `define` 注入 `__APP_VERSION__/__BUILD_TIME__/__GIT_SHA__`
  (讀檔以本檔位置解析且全程 try/catch,確保任何環境載入 config 都不會丟例外)。

---

## 9. PWA / 版本更新機制

- 提示式更新:`src/components/UpdatePrompt.jsx` 用 `useRegisterSW` 偵測新版 → 跳橫幅 →
  使用者按「立即更新」才 `updateServiceWorker(true)`;另每 30 分鐘 + 切回分頁自動檢查。
- `src/lib/version.js`:版本常數、`hasUnseenUpdate()`(首頁紅點)、`forceRefresh()`(清快取重載,保底)。
- 改 PWA 行為後注意:舊版 service worker 仍是上一代,使用者**第一次需硬刷新**才接管新版。

---

## 10. 匯出 / 分享

- `src/components/ExportMenu.jsx` + `src/lib/exportContent.js`(動態 import,避免拖慢首屏)。
- 單題(`QuestionView` 詳解下方)與整回合(`Practice` 進度列)皆可:**複製 Markdown / 下載 .md / 匯出 PDF**。
- PDF 用列印視窗(`window.print()`):文字可選取、附圖內嵌、PMID/DOI 可點。`ExportMenu` 的 `drop` 參數控制選單方向(頁頂用 `down`、頁底用 `up`)。
- 匯出內容含來源、版本、免責聲明頁尾。

---

## 11. git 工作流程

- 在功能分支開發(目前 `claude/taiwan-med-exam-app-planning-WZgcu`)。
- 合併進 `main` 前先 `git fetch origin main && git merge origin/main`(**另有 Codex 持續推 main**,需先 reconcile;通常為附加式、乾淨合併)。
- commit 作者固定 name=`Claude`、email=`noreply@anthropic.com`。
- `tmp_drafts/` 為暫存草稿工作區,已 gitignore;成品合併進 `src/data/explanations.<年>.json` 後即可。

---

## 12. 免責聲明同步

App 內 `src/components/Disclaimer.jsx` 與根目錄 `DISCLAIMER.md` 內容須一致,改一處要同步另一處。
聯絡 / 下架通知:dirtywolf1213@gmail.com。
