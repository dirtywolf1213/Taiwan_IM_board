#!/usr/bin/env python3
"""匯出題目給 AI 撰寫詳解用。

輸出精簡 JSON(id, year, num, subject, question, options, answerLetter),
可直接貼到 AI 指令後面。預設只匯出「尚無詳解」的題目。

用法:
    python3 tools/export_questions.py --year 114                 # 114 年所有缺詳解題
    python3 tools/export_questions.py --year 114 --subject 心臟血管
    python3 tools/export_questions.py --year 114 --all           # 含已有詳解者
    python3 tools/export_questions.py --year 114 --nums 1,11,18   # 指定題號
"""
import argparse
import json
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--subject', default=None, help='只匯出某科')
    ap.add_argument('--nums', default=None, help='指定題號,逗號分隔')
    ap.add_argument('--all', action='store_true', help='含已有詳解的題')
    args = ap.parse_args()

    qs = json.loads(Path(f'src/data/questions.{args.year}.json').read_text(encoding='utf-8'))

    expl_path = Path(f'src/data/explanations.{args.year}.json')
    done = set()
    if expl_path.exists():
        done = {k for k, v in json.loads(expl_path.read_text(encoding='utf-8')).items() if v.get('text')}

    nums = None
    if args.nums:
        nums = {int(n) for n in args.nums.split(',')}

    out = []
    for q in qs:
        if args.subject and q['subject'] != args.subject:
            continue
        if nums is not None and q['num'] not in nums:
            continue
        if not args.all and q['id'] in done:
            continue
        out.append({
            'id': q['id'], 'year': q['year'], 'num': q['num'], 'subject': q['subject'],
            'question': q['question'], 'options': q['options'], 'answerLetter': q['answerLetter'],
        })

    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
