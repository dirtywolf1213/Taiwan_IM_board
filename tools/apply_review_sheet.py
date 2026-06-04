# -*- coding: utf-8 -*-
"""把審核稿的「人工決定」回寫進題庫。
用法: python3 tools/apply_review_sheet.py review/感染_114.md --by 王醫師
規則:
  通過      -> status=reviewed,文字不動
  採用建議  -> 套用 AI 區塊內 ```建議全文 ... ``` 後,status=reviewed
  跳過/空白 -> 不動(維持 draft)
  其他自由文字 -> 不動(視為交給 AI 處理的註記),列出供後續處理
都會蓋上 reviewedBy / reviewedAt。
"""
import json, re, sys, argparse, datetime, glob

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet')
    ap.add_argument('--by', required=True, help='審核人姓名(記入 reviewedBy)')
    args = ap.parse_args()
    md = open(args.sheet, encoding='utf-8').read()
    blocks = re.findall(r'<!--Q (\S+)-->(.*?)<!--/Q-->', md, re.S)
    today = datetime.date.today().isoformat()
    # 依年份分組
    changes = {}   # year -> list of (qid, action, newtext)
    notes = []
    for qid, body in blocks:
        year = qid.split('-')[0]
        m = re.search(r'\*\*🧑‍⚕️ 人工決定\*\*：(.*?)(?:\n\n|\Z)', body, re.S)
        decision = (m.group(1).strip() if m else '')
        if not decision or decision == '跳過':
            continue
        if decision.startswith('通過'):
            changes.setdefault(year, []).append((qid, 'pass', None))
        elif decision.startswith('採用建議'):
            fm = re.search(r'```建議全文\s*(.*?)```', body, re.S)
            if not fm:
                notes.append(f'{qid}: 標「採用建議」但找不到 ```建議全文``` 區塊,略過'); continue
            changes.setdefault(year, []).append((qid, 'replace', fm.group(1).strip()))
        else:
            notes.append(f'{qid}: 自由註記 → {decision[:80]}')
    total = 0
    for year, items in changes.items():
        path = f'src/data/explanations.{year}.json'
        d = json.load(open(path, encoding='utf-8'))
        for qid, action, newtext in items:
            if qid not in d:
                notes.append(f'{qid}: 題庫無此 id'); continue
            if action == 'replace':
                d[qid]['text'] = newtext
            d[qid]['status'] = 'reviewed'
            d[qid]['reviewedBy'] = args.by
            d[qid]['reviewedAt'] = today
            total += 1
        json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(path, 'a').write('\n')
        print(f'  {path}: 更新 {len(items)} 題')
    print(f'共標記 reviewed {total} 題 (審核人:{args.by})')
    if notes:
        print('\n待處理/註記:')
        for n in notes: print(' -', n)

if __name__ == '__main__':
    main()
