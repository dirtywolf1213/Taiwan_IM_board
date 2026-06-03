#!/usr/bin/env python3
"""解析「舊格式」內科專科考題 PDF(約 104–108 年)。

舊格式特徵:
- 以科目分段,段首為「… 筆試題 -- 心臟科 / 胸腔科 / …(或 考古題)」。
- 每段題號自 1 重新計;題目開頭為「(答案) 題號.題幹」,如 "(A) 1.有關…"。
- 選項 A.~E.。
- 科目段標題即科目來源(自動分類);「考古題」段需另以內容分類(先留空)。
- 全卷題數約 198–200。輸出時改用「全卷連續流水號」當 num/id,確保唯一。

用法:
    python3 tools/parse_pdf_old.py source-pdfs/104/考題_104.pdf --year 104 --out src/data/questions.104.json
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

CJK = r'一-鿿　-〿＀-￯'
SPACE_BETWEEN_CJK = re.compile(rf'(?<=[{CJK}])\s+(?=[{CJK}])')
FIGURE_REF = re.compile(r'如圖|如附圖|如下圖|附圖|見圖|圖所示|圖中|下圖|圖示|如列')

SECTION = re.compile(r'筆試題\s*--\s*(\S+)')
Q_START = re.compile(r'^\s*\(([A-E])\)\s*(\d+)\.\s*(.*)$')
OPT_START = re.compile(r'^\s*([A-E])\.\s*(.*)$')
# 列印頁首/雜訊:日期時間、exam_xxx、Page 標記
NOISE = re.compile(r'exam_\d+|^\s*\d{4}/\d{1,2}/\d{1,2}\s|內科專科醫師|Page\.?\s')

# 科目段名稱 → 11 科
SUBJECT_MAP = {
    '心臟科': '心臟血管', '胸腔科': '胸腔', '消化科': '消化', '腎臟科': '腎臟',
    '感染科': '感染', '內分泌科': '新陳代謝與內分泌', '新陳代謝科': '新陳代謝與內分泌',
    '風濕科': '風濕免疫及過敏', '免疫科': '風濕免疫及過敏',
    '血液科': '血液腫瘤', '腫瘤科': '血液腫瘤',
    '神經科': '神經', '精神科': '精神', '皮膚科': '皮膚',
    '考古題': '',   # 待依內容分類
}


def normalize(s):
    prev = None
    while prev != s:
        prev = s
        s = SPACE_BETWEEN_CJK.sub('', s)
    return re.sub(r'\s{2,}', ' ', s).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    text = subprocess.run(['pdftotext', '-layout', args.pdf, '-'],
                          capture_output=True, text=True, check=True).stdout

    questions = []
    cur = None
    cur_subject_raw = None
    cur_opt = None
    opt_buf = None

    def flush_opt():
        nonlocal opt_buf
        if cur and cur_opt and opt_buf is not None:
            cur['options'].append({'letter': cur_opt, 'text': opt_buf.strip()})
        opt_buf = None

    for line in text.splitlines():
        msec = SECTION.search(line)
        if msec:
            flush_opt()
            cur = None
            cur_opt = None
            cur_subject_raw = msec.group(1)
            continue
        if NOISE.search(line):
            continue
        if not line.strip():
            continue

        mq = Q_START.match(line)
        if mq:
            flush_opt()
            cur_opt = None
            cur = {'answerLetter': mq.group(1), 'secnum': int(mq.group(2)),
                   'stem': mq.group(3).strip(), 'options': [],
                   'subject_raw': cur_subject_raw, 'expect': 'A'}
            questions.append(cur)
            continue
        if cur is None:
            continue
        mo = OPT_START.match(line)
        # 選項必須從 A 開始、嚴格連續(A→B→C→D→E),避免句中 "E. coli" 等被誤判
        if mo and mo.group(1) == cur['expect']:
            flush_opt()
            cur_opt = mo.group(1)
            opt_buf = mo.group(2)
            cur['expect'] = chr(ord(cur_opt) + 1)
        elif cur_opt is not None:
            opt_buf += ' ' + line.strip()
        else:
            cur['stem'] += ' ' + line.strip()
    flush_opt()

    result = []
    for seq, q in enumerate(questions, 1):
        letters = [o['letter'] for o in q['options']]
        try:
            ans_idx = letters.index(q['answerLetter'])
        except ValueError:
            ans_idx = -1
        blob = q['stem'] + ' ' + ' '.join(o['text'] for o in q['options'])
        subject = SUBJECT_MAP.get(q['subject_raw'], '')
        result.append({
            'id': f'{args.year}-{seq:03d}',
            'year': args.year,
            'num': seq,
            'subject': subject,
            'sectionRaw': q['subject_raw'],
            'question': normalize(q['stem']),
            'options': [normalize(o['text']) for o in q['options']],
            'answer': ans_idx,
            'answerLetter': q['answerLetter'],
            'needsImage': bool(FIGURE_REF.search(blob)),
            'image': '',
            'explanation': '',
        })

    out = Path(args.out)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    bad = [q['num'] for q in result if q['answer'] < 0]
    wrong = [q['num'] for q in result if len(q['options']) != 5]
    nosub = [q['num'] for q in result if not q['subject']]
    from collections import Counter
    secs = Counter(q['sectionRaw'] for q in result)
    print(f'題數: {len(result)}  輸出: {out}')
    print(f'各段: {dict(secs)}')
    print(f'選項≠5: {wrong or "無"}')
    print(f'答案對不到選項: {bad or "無"}')
    print(f'考古題(待分類)題號: {nosub or "無"}')
    if bad or wrong:
        print('⚠️ 需人工檢查', file=sys.stderr)


if __name__ == '__main__':
    main()
