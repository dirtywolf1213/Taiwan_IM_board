# 專案維護原則(給協助開發的 AI)

本檔記錄「動到某些東西時必須一起更新哪些地方」的原則,任何 AI 接手前請先讀。

## 🔴 新增/修改「使用者看得到的功能」時,務必三件事一起做

每當有 **使用者看得到的更動**(新功能、UI 變動、行為改變、重要修正),同一個變更要同步更新:

1. **`src/data/changelog.json`** — 在陣列**最前面**新增一筆 `{ version, date, items[] }`,
   並依語意遞增版本號(新功能 → minor;修正 → patch)。版本號是 App 內「版本/更新紀錄」的單一真實來源。
2. **`src/components/UserManual.jsx`** — 把新功能的「怎麼用」寫進對應段落(或新增段落),
   讓首頁「📖 使用說明」的教學與實際功能一致。
3. **`README.md`** — 更新對應說明與最後的「現況」清單。

> 簡記:**改功能 = 改 changelog + 改使用說明 + 改 README**。三者缺一,使用者就會看到「功能與說明對不上」。

## 其他既有原則

- **詳解撰寫**:一律遵循 [`docs/詳解撰寫規範.md`](./docs/詳解撰寫規範.md)(固定五段式),
  原則性更動要同步更新 [`docs/AI寫詳解教學與指令.md`](./docs/AI寫詳解教學與指令.md) 與 [`docs/AI_REVIEWER_README.md`](./docs/AI_REVIEWER_README.md)。
  詳解 `status` 未經醫師審核一律維持 `draft`,AI 不可自行改為 `reviewed`。
- **題庫資料**:改動後跑 `python3 tools/validate.py`;新增/改題號要重建 `src/data/index.json`(`tools/build_index.py`)。
- **部署**:GitHub Pages 由 Actions 以 `BASE_PATH=/Taiwan_IM_board/` 建置;Cloudflare Worker 由
  `wrangler.jsonc`(`assets → ./dist`)以根路徑部署,**不可設 `BASE_PATH`**。
- **git**:在功能分支開發,合併到 `main` 前先 `git fetch origin main && git merge origin/main`(Codex 會持續推 main)。

## 免責聲明同步

- App 內免責聲明 `src/components/Disclaimer.jsx` 與根目錄 `DISCLAIMER.md` 內容需一致,改一處要同步另一處。
