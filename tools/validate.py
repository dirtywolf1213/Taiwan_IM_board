#!/usr/bin/env python3
"""題庫資料驗證。

檢查 src/data/questions.*.json 每題的資料完整性與一致性,在轉檔/新增年度後
盡早抓出錯誤(避免前端默默壞掉)。

檢查項目:
- 必要欄位齊全且型別正確(id, year, num, subject, question, options, answer, answerLetter)
- options 為 5 個非空字串(內科甄審為單選 A–E)
- answer 為合法索引,且 answerLetter == 對應字母
- subject 屬於 11 個合法科目
- 同年題號不重複、不缺號(1..N 連續)
- id 全域唯一
- image 非空時,對應檔案須存在於 public/
- needsImage=True 但 image 為空 → 警告(圖尚未匯入的中間狀態)

用法: python3 tools/validate.py
回傳碼: 有錯誤時為 1,僅警告或全過為 0。
"""
import json
import sys
from glob import glob
from pathlib import Path

SUBJECTS = {
    '心臟血管', '胸腔', '消化', '新陳代謝與內分泌', '腎臟',
    '風濕免疫及過敏', '血液腫瘤', '感染', '神經', '精神', '皮膚',
}
REQUIRED = ['id', 'year', 'num', 'subject', 'question', 'options', 'answer', 'answerLetter']
PUBLIC = Path('public')


def validate_file(path, seen_ids):
    errors, warnings = [], []
    qs = json.loads(Path(path).read_text(encoding='utf-8'))
    nums = []
    for idx, q in enumerate(qs):
        where = f'{Path(path).name}[{idx}] (num={q.get("num", "?")})'

        for f in REQUIRED:
            if f not in q:
                errors.append(f'{where}: 缺欄位 {f}')
        if any(f not in q for f in REQUIRED):
            continue

        if q['id'] in seen_ids:
            errors.append(f'{where}: id 重複 {q["id"]}')
        seen_ids.add(q['id'])
        nums.append(q['num'])

        opts = q['options']
        if not isinstance(opts, list) or len(opts) != 5:
            errors.append(f'{where}: options 應為 5 個(實際 {len(opts) if isinstance(opts, list) else "非陣列"})')
        elif any((not isinstance(o, str) or not o.strip()) for o in opts):
            errors.append(f'{where}: options 含空白項')

        ans = q['answer']
        multi = q.get('answers')
        if multi is not None:
            # 送分/多答案題:每個索引需合法
            if not isinstance(multi, list) or not multi or any(
                    not isinstance(a, int) or not (0 <= a < len(opts)) for a in multi):
                errors.append(f'{where}: answers 索引不合法 ({multi})')
        elif not isinstance(ans, int) or not (0 <= ans < len(opts)):
            errors.append(f'{where}: answer 索引不合法 ({ans})')
        elif q['answerLetter'] != chr(65 + ans):
            errors.append(f'{where}: answerLetter({q["answerLetter"]}) 與 answer({ans}→{chr(65 + ans)}) 不一致')

        if q['subject'] not in SUBJECTS:
            errors.append(f'{where}: subject 不在 11 科內 ("{q["subject"]}")')

        if not str(q['question']).strip():
            errors.append(f'{where}: question 為空')

        img = q.get('image', '')
        if img:
            if not (PUBLIC / img).exists():
                errors.append(f'{where}: image 檔案不存在 public/{img}')
        elif q.get('needsImage'):
            warnings.append(f'{where}: needsImage=True 但尚未匯入圖片')

    # 題號連續性
    if nums:
        dup = {n for n in nums if nums.count(n) > 1}
        if dup:
            errors.append(f'{Path(path).name}: 題號重複 {sorted(dup)}')
        missing = sorted(set(range(1, max(nums) + 1)) - set(nums))
        if missing:
            errors.append(f'{Path(path).name}: 題號缺號 {missing}')

    return len(qs), errors, warnings


def main():
    files = sorted(glob('src/data/questions.*.json'))
    if not files:
        print('找不到 src/data/questions.*.json', file=sys.stderr)
        return 1

    seen_ids = set()
    all_err, all_warn, total = [], [], 0
    for f in files:
        n, errs, warns = validate_file(f, seen_ids)
        total += n
        all_err += errs
        all_warn += warns
        print(f'  {Path(f).name}: {n} 題, 錯誤 {len(errs)}, 警告 {len(warns)}')

    # 詳解覆蓋率(非錯誤,僅報告進度)
    print('\n詳解覆蓋率:')
    for f in files:
        year = Path(f).name.split('.')[1]
        qn = len(json.loads(Path(f).read_text(encoding='utf-8')))
        ef = Path(f).parent / f'explanations.{year}.json'
        reviewed = draft = 0
        if ef.exists():
            for e in json.loads(ef.read_text(encoding='utf-8')).values():
                if not e.get('text'):
                    continue
                if e.get('status') == 'reviewed':
                    reviewed += 1
                else:
                    draft += 1
        print(f'  {year}: 已審核 {reviewed}/{qn}、草稿 {draft}')

    print(f'\n總計 {total} 題 / {len(files)} 檔')
    for w in all_warn:
        print(f'  ⚠️  {w}')
    for e in all_err:
        print(f'  ❌ {e}')

    # 索引同步檢查(src/data/index.json 必須與題庫一致)
    idx_path = Path('src/data/index.json')
    if idx_path.exists():
        idx_ids = {q['id'] for q in json.loads(idx_path.read_text(encoding='utf-8'))}
        if idx_ids != seen_ids:
            miss = len(seen_ids - idx_ids)
            extra = len(idx_ids - seen_ids)
            all_err.append(f'index.json 與題庫不同步(缺 {miss}、多 {extra})→ 請重跑 tools/build_index.py')
            print(f'  ❌ index.json 與題庫不同步;請執行 python3 tools/build_index.py')
    else:
        all_warn.append('尚無 src/data/index.json(請執行 tools/build_index.py)')

    if all_err:
        print(f'\n驗證失敗:{len(all_err)} 項錯誤')
        return 1
    print('\n✅ 驗證通過' + (f'(有 {len(all_warn)} 項警告)' if all_warn else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
