# 審稿操作手冊（給操作者：你）

這份是「**我（人）怎麼跑審核**」的步驟＋**可直接複製貼給 AI 的指令**。
審核員 AI 的標準另見 [`../docs/AI_REVIEWER_README.md`](../docs/AI_REVIEWER_README.md);流程定義見 [`../docs/詳解撰寫規範.md`](../docs/詳解撰寫規範.md) §8。

---

## 流程總覽（一年一科為一批）

```
①產生審核稿  →  ②AI 初審(找錯)  →  ③你做人工決定  →  ④入庫+部署
   (AI/你跑)        (AI 跑)            (只有你能做)        (AI/你跑)
```
分工:**①②④ 交給 AI 做;③ 只有你做**(醫療最終把關)。
安全紅線:**AI 永遠不會自己把詳解改成 `reviewed`,一定要你的「人工決定」。**

---

## 步驟 ①＋②：產生審核稿並請 AI 初審

開一個 AI 對話，把下面整段貼進去（**把 `109` 和 `感染` 換成你要審的年/科**）：

```text
請依 docs/AI_REVIEWER_README.md 的標準，幫我審核【109 年・感染 科】的詳解：
1. 若 review/感染_109.md 不存在，先執行：
   python3 tools/make_review_sheet.py --year 109 --subject 感染
2. 開一個「獨立的 reviewer agent」（批判式「找錯」心態、非原作者；用 WebSearch 查最新指引與 PMID/DOI），
   逐題審 src/data/questions.109.json 與 explanations.109.json 中的感染科題目。
   檢查重點依 README：最新（有無更新版指引）、最權威（來源層級）、不能出錯（答案方向／劑量／cutoff／引用對得上／PMID真偽）。
   每題只輸出一行：  <id> | OK 或 FLAG | 疑慮(繁中) | 建議(繁中)
3. 把結果存成 verdicts 檔，執行：
   python3 tools/inject_ai_review.py review/感染_109.md <verdicts檔>
4. 最後告訴我：FLAG 有哪幾題、各自的疑慮與建議摘要。
```

AI 跑完後，`review/感染_109.md` 每題的「🤖 AI 審核」欄會填好，**⚠️ 需確認的會排在前面**，標題也會有「✅ N 題／⚠️ M 題」統計。

---

## 步驟 ③：你做人工決定（只有你能做）

打開 `review/感染_109.md`（**電腦編輯器或手機開 GitHub 都行**），逐題看「目前詳解」與「🤖 AI 審核」，
**先看 ⚠️ 需確認的**，在每題的「**🧑‍⚕️ 人工決定**：」後面填一個:

| 你填 | 意思 |
|---|---|
| `通過` | 維持現文字，標記為 `reviewed` |
| `採用建議` | 套用 AI 在該題 ```建議全文``` 區塊的版本後，標記 `reviewed` |
| `跳過` | 維持 `draft`（之後再處理） |
| 自由註記，例如 `把劑量改成 X、補一句 Y` | 交給 AI 照辦改寫，改完再標 `reviewed` |

範例：
```
**🧑‍⚕️ 人工決定**：通過
```
```
**🧑‍⚕️ 人工決定**：111-093 把「敏感性 25–56%」那句再加上「血清 CrAg 對瀰漫性/腦膜感染才高敏」
```

> 小撇步：AI 標 ✅ 的可以快速 `通過`；把精神花在 ⚠️ 那幾題。

---

## 步驟 ④：入庫＋部署

填好後，把下面貼給 AI（換年/科與你的名字）：

```text
請 apply review/感染_109.md，審核人填「<你的名字>」：
1. 對於有「自由註記」的題目，先依我的註記修改 src/data/explanations.109.json 的詳解文字。
2. 執行：python3 tools/apply_review_sheet.py review/感染_109.md --by <你的名字>
3. 執行 python3 tools/validate.py 確認通過。
4. commit 後合併到 main 並 push（觸發 GitHub Pages 部署）。
```

或你自己在電腦跑：
```bash
python3 tools/apply_review_sheet.py review/感染_109.md --by <你的名字>
python3 tools/validate.py
```
完成後該批題目會變 `reviewed`、蓋上 `reviewedBy`/`reviewedAt`，線上「草稿・未經審核」標記消失。

> 部署後因為是 PWA，第一次看請**強制重新整理**（Ctrl/⌘+Shift+R）或清除網站資料，讓新版接管。

---

## 一頁速查

```text
① 產生＋初審：貼給 AI →「依 docs/AI_REVIEWER_README.md 審核 <年> 年 <科>，產生審核稿＋獨立AI初審＋注入，FLAG 排前面」
② 人工決定：開 review/<科>_<年>.md，每題填 通過 / 採用建議 / 跳過 / 自由註記（先看 ⚠️）
③ 入庫：貼給 AI →「apply review/<科>_<年>.md，審核人 <你的名字>，自由註記的先幫我改，然後 validate＋push main」
```

指令一覽：
```bash
python3 tools/make_review_sheet.py  --year <年> --subject <科>     # 產生審核稿
python3 tools/inject_ai_review.py   review/<科>_<年>.md <verdicts>  # 注入 AI 初審(AI 跑)
python3 tools/apply_review_sheet.py review/<科>_<年>.md --by <名字> # 人工決定入庫
python3 tools/validate.py                                          # 驗證
```
