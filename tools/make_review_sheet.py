# -*- coding: utf-8 -*-
"""產生「人工＋AI 共同審核稿」(Markdown)。
用法: python3 tools/make_review_sheet.py --year 114 --subject 感染
只挑 status=draft 的題目;若 review/<科>_<年>.md 已存在則不覆蓋(避免蓋掉已填內容)。
"""
import json, argparse, os

def load(p):
    return json.load(open(p, encoding='utf-8'))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--subject', required=True)
    ap.add_argument('--all', action='store_true', help='含已 reviewed 也輸出')
    args = ap.parse_args()
    y = args.year
    qs = {q['id']: q for q in load(f'src/data/questions.{y}.json')}
    expl = load(f'src/data/explanations.{y}.json')
    rows = []
    for qid in sorted(expl):
        q = qs.get(qid)
        if not q or q.get('subject') != args.subject:
            continue
        obj = expl[qid]
        if obj.get('status') == 'reviewed' and not args.all:
            continue
        rows.append((qid, q, obj))
    if not rows:
        print('沒有待審題目'); return
    out = [f'# 審核稿 ・ {args.subject} ・ {y} 年  （{len(rows)} 題待審）', '',
           '> 使用方式:逐題看「目前詳解」與「🤖 AI 審核」,在「🧑‍⚕️ 人工決定」欄填寫:',
           '> **`通過`**(維持現文字並標記已審核) ・ **`採用建議`**(套用 AI 的 ```建議全文``` 後標記已審核) ・ **`跳過`**(維持草稿) ・ 或自由註記(交給 AI 處理)。',
           '> 填好後執行 `python3 tools/apply_review_sheet.py <本檔> --by 你的名字`。', '']
    for qid, q, obj in rows:
        ans = q.get('answerLetter') or ''
        out.append(f'<!--Q {qid}-->')
        out.append(f'### {qid} ・ 正解 {ans} ・ status: {obj.get("status","draft")}')
        out.append('')
        out.append('**題幹**  ')
        out.append(q['question'].strip())
        out.append('')
        for j, o in enumerate(q['options']):
            mark = ' ← 正解' if ans and chr(65+j) == ans else ''
            out.append(f'- ({chr(65+j)}) {o.strip()}{mark}')
        out.append('')
        out.append('<details><summary><b>目前詳解</b>(點開)</summary>')
        out.append('')
        out.append(obj['text'])
        out.append('')
        out.append('</details>')
        out.append('')
        out.append('**🤖 AI 審核**：⏳ 待審')
        out.append('- 疑慮：')
        out.append('- 建議：')
        out.append('')
        out.append('**🧑‍⚕️ 人工決定**：')
        out.append('')
        out.append('<!--/Q-->')
        out.append('')
    path = f'review/{args.subject}_{y}.md'
    if os.path.exists(path):
        print(f'⚠️ {path} 已存在,未覆蓋(避免蓋掉已填內容)。如要重建請先刪除。'); return
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'已產生 {path}（{len(rows)} 題）')

if __name__ == '__main__':
    main()
