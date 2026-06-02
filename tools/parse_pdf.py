#!/usr/bin/env python3
"""把內科專科醫師甄審試卷 PDF 轉成題庫 JSON。

用法:
    python tools/parse_pdf.py source-pdfs/考題_114.pdf --year 114 --out src/data/questions.114.json

PDF 特性(以 114 年為例):
- 每題以 "[答案] 題號." 開頭,例如 "[C]   1. ..."；答案字母直接內嵌。
- 選項為 "A. ~ E."。
- 題幹/選項可跨多行(續行縮排)。
- 頁首固定為 "...內科專科醫師甄審試卷 ... 第 X 頁 / 共 N 頁"。
- 部分題目提到「圖/附圖/如圖」,但圖不在此 PDF(在另一份檔案),這些題會標記 needsImage。
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

Q_START = re.compile(r'^\[([A-E])\]\s+(\d+)\.\s*(.*)$')
OPT_START = re.compile(r'^\s*([A-E])\.\s*(.*)$')
HEADER = re.compile(r'內科專科醫師甄審試卷|第\s*\d+\s*頁\s*/\s*共\s*\d+\s*頁')
# 真正「看圖作答」的措辭(排除「心電圖」「腦波圖」等含「圖」的普通名詞)
FIGURE_REF = re.compile(r'如圖|如附圖|如下圖|附圖|見圖|圖所示|圖中|下圖|圖示')


def extract_text(pdf_path: str) -> str:
    """用 pdftotext -layout 抽文字(保留版面,利於辨識題號/選項)。"""
    out = subprocess.run(
        ['pdftotext', '-layout', pdf_path, '-'],
        capture_output=True, text=True, check=True,
    )
    return out.stdout


CJK = r'一-鿿　-〿＀-￯'
SPACE_BETWEEN_CJK = re.compile(rf'(?<=[{CJK}])\s+(?=[{CJK}])')


def normalize(s: str) -> str:
    """移除中文字之間因換行被插入的空格(保留英文/數字間的空格)。"""
    prev = None
    while prev != s:
        prev = s
        s = SPACE_BETWEEN_CJK.sub('', s)
    return re.sub(r'\s{2,}', ' ', s).strip()


def clean_lines(text: str):
    for line in text.splitlines():
        if HEADER.search(line):
            continue
        if not line.strip():
            continue
        yield line


def parse(text: str, year: int):
    questions = []
    cur = None          # 目前題目
    cur_opt = None      # 目前選項 letter

    def flush_opt(buf):
        if cur and cur_opt and buf is not None:
            cur['options'].append({'letter': cur_opt, 'text': buf.strip()})

    opt_buf = None
    for line in clean_lines(text):
        m_q = Q_START.match(line.strip())
        if m_q:
            # 收尾上一題
            flush_opt(opt_buf)
            opt_buf = None
            cur_opt = None
            ans, num, stem = m_q.group(1), int(m_q.group(2)), m_q.group(3)
            cur = {'num': num, 'answerLetter': ans,
                   'stem': stem.strip(), 'options': []}
            questions.append(cur)
            continue
        if cur is None:
            continue
        m_o = OPT_START.match(line)
        if m_o and (not cur['options'] or m_o.group(1) > cur['options'][-1]['letter']):
            # 新選項(字母須遞增,避免把題幹內的 "A." 誤判)
            flush_opt(opt_buf)
            cur_opt = m_o.group(1)
            opt_buf = m_o.group(2)
        elif cur_opt is not None:
            opt_buf += ' ' + line.strip()
        else:
            # 題幹續行
            cur['stem'] += ' ' + line.strip()
    flush_opt(opt_buf)

    # 整理成最終格式
    result = []
    for q in questions:
        letters = [o['letter'] for o in q['options']]
        try:
            ans_idx = letters.index(q['answerLetter'])
        except ValueError:
            ans_idx = -1  # 答案字母不在選項中(異常,需人工檢查)
        blob = q['stem'] + ' ' + ' '.join(o['text'] for o in q['options'])
        needs_image = bool(FIGURE_REF.search(blob))
        result.append({
            'id': f'{year}-{q["num"]:03d}',
            'year': year,
            'num': q['num'],
            'subject': '',                       # 待分類
            'question': normalize(q['stem']),
            'options': [normalize(o['text']) for o in q['options']],
            'answer': ans_idx,
            'answerLetter': q['answerLetter'],
            'needsImage': needs_image,
            'image': '',                         # 圖在另一份檔,之後補
            'explanation': '',
        })
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    text = extract_text(args.pdf)
    qs = parse(text, args.year)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(qs, ensure_ascii=False, indent=2), encoding='utf-8')

    # 摘要
    bad = [q['num'] for q in qs if q['answer'] < 0]
    wrong_opts = [q['num'] for q in qs if len(q['options']) != 5]
    img = [q['num'] for q in qs if q['needsImage']]
    print(f'題數: {len(qs)}')
    print(f'輸出: {out}')
    print(f'選項數≠5 的題: {wrong_opts or "無"}')
    print(f'答案對不到選項的題: {bad or "無"}')
    print(f'需補圖的題({len(img)}): {img}')
    if bad or wrong_opts:
        print('⚠️  有需要人工檢查的題目', file=sys.stderr)


if __name__ == '__main__':
    main()
