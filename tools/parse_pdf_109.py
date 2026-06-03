#!/usr/bin/env python3
"""解析 109 年考題(雙欄、答案在左側邊欄、全卷 1–200 題)。

格式特徵:
- 兩欄排版;每題以「題號.」開頭(無內嵌答案),選項 A.~E.。
- 答案為左側邊欄的單一字母(A–E),其下方小數為答對率(難度)。
- 無科目段標題(科目需另以內容分類,如 110–114)。

做法:
- 用座標抓「題號 ↔ 同列左側答案字母(+難度)」。
- 以左欄→右欄、逐頁串接還原閱讀順序的文字,再解析題幹與選項。
- 答案以座標抓到的為準。

用法:
    python3 tools/parse_pdf_109.py source-pdfs/109/考題_109.pdf --year 109 --out src/data/questions.109.json
"""
import argparse
import json
import re
import sys
from pathlib import Path

import fitz

CJK = r'一-鿿　-〿＀-￯'
SPACE_BETWEEN_CJK = re.compile(rf'(?<=[{CJK}])\s+(?=[{CJK}])')
FIGURE_REF = re.compile(r'如圖|如附圖|如下圖|附圖|見圖|圖所示|圖中|下圖|圖示')
NOISE = re.compile(r'甄審試卷|【第.*堂】|Page\.?\s|內科專科醫|師甄審')
MID = 305  # 欄位分界 x


def normalize(s):
    prev = None
    while prev != s:
        prev = s
        s = SPACE_BETWEEN_CJK.sub('', s)
    return re.sub(r'\s{2,}', ' ', s).strip()


def extract_answers(doc):
    """回傳 {num: (answerLetter, difficulty)}。"""
    ans = {}
    for page in doc:
        words = page.get_text('words')
        anchors, letters, diffs = [], [], []
        for w in words:
            x0, y0, t = w[0], w[1], w[4]
            if re.fullmatch(r'\d{1,3}\.', t):
                col = 'L' if x0 < MID else 'R'
                anchors.append((int(t[:-1]), x0, y0, col))
            elif re.fullmatch(r'[A-E]', t):
                if x0 < 24:
                    letters.append(('L', x0, y0, t))
                elif 288 < x0 < 314:
                    letters.append(('R', x0, y0, t))
            elif re.fullmatch(r'0\.\d+', t):
                side = 'L' if x0 < 30 else ('R' if 288 < x0 < 314 else None)
                if side:
                    diffs.append((side, y0, float(t)))
        for num, ax, ay, col in anchors:
            cand = [(abs(ly - ay), lt) for (lc, lx, ly, lt) in letters
                    if lc == col and abs(ly - ay) < 14]
            if not cand:
                continue
            letter = min(cand)[0:2][1]
            dcand = [(abs(dy - ay), dv) for (dc, dy, dv) in diffs
                     if dc == col and -2 < (dy - ay) < 30]
            difficulty = min(dcand)[1] if dcand else None
            ans[num] = (letter, difficulty)
    return ans


def extract_text(doc):
    """左欄→右欄逐頁串接,回傳文字行串列。"""
    lines = []
    for page in doc:
        h = page.rect.height
        left = page.get_text(clip=fitz.Rect(0, 0, MID, h))
        right = page.get_text(clip=fitz.Rect(MID, 0, page.rect.width, h))
        lines += left.splitlines() + right.splitlines()
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--year', type=int, default=109)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    answers = extract_answers(doc)

    Q_START = re.compile(r'^(\d{1,3})\.\s*(.*)$')
    OPT = re.compile(r'^([A-E])\.\s+(.*)$')

    questions = []
    cur = None
    cur_opt = None
    opt_buf = None
    expect_num = 1

    def flush_opt():
        nonlocal opt_buf
        if cur and cur_opt and opt_buf is not None:
            cur['options'].append(opt_buf.strip())
        opt_buf = None

    for raw in extract_text(doc):
        line = raw.strip()
        if not line or NOISE.search(line):
            continue
        if re.fullmatch(r'[A-E]', line) or re.fullmatch(r'0\.\d+', line):
            continue  # 邊欄答案/難度殘留

        mo = OPT.match(line)
        mq = Q_START.match(line)
        # 題號必須等於預期的下一題(避免內文數字誤判)
        if mq and int(mq.group(1)) == expect_num:
            flush_opt()
            cur_opt = None
            cur = {'num': expect_num, 'stem': mq.group(2).strip(), 'options': [], 'expect': 'A'}
            questions.append(cur)
            expect_num += 1
            continue
        if cur is None:
            continue
        if mo and mo.group(1) == cur['expect']:
            flush_opt()
            cur_opt = mo.group(1)
            opt_buf = mo.group(2)
            cur['expect'] = chr(ord(cur_opt) + 1)
        elif cur_opt is not None:
            opt_buf += ' ' + line
        else:
            cur['stem'] += ' ' + line
    flush_opt()

    result = []
    for q in questions:
        a = answers.get(q['num'], (None, None))
        letter, difficulty = a
        opts = [normalize(o) for o in q['options']]
        ans_idx = (ord(letter) - 65) if letter and 0 <= ord(letter) - 65 < len(opts) else -1
        blob = q['stem'] + ' ' + ' '.join(opts)
        result.append({
            'id': f'{args.year}-{q["num"]:03d}', 'year': args.year, 'num': q['num'],
            'subject': '', 'question': normalize(q['stem']), 'options': opts,
            'answer': ans_idx, 'answerLetter': letter or '',
            'difficulty': difficulty,
            'needsImage': bool(FIGURE_REF.search(blob)), 'image': '', 'explanation': '',
        })

    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    nums = [q['num'] for q in result]
    missing = sorted(set(range(1, 201)) - set(nums))
    noans = [q['num'] for q in result if q['answer'] < 0]
    wrong = [q['num'] for q in result if len(q['options']) != 5]
    print(f'題數: {len(result)} (預期 200)')
    print(f'缺號: {missing or "無"}')
    print(f'無答案/答案異常: {noans or "無"}')
    print(f'選項≠5: {wrong or "無"}')
    if missing or noans or wrong:
        print('⚠️ 需檢查', file=sys.stderr)


if __name__ == '__main__':
    main()
