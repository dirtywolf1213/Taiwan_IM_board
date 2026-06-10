#!/usr/bin/env python3
"""產生輕量題庫索引 src/data/index.json。

索引只含「統計與篩選」需要的最少欄位(id, year, num, subject),不含題幹/選項/
詳解。App 以索引即時顯示首頁統計、各科/各年題數,實際題目內容再依年份動態載入。

新增/修改題庫後請重跑(validate.py 會檢查索引是否與題庫同步)。

用法: python3 tools/build_index.py
"""
import json
from glob import glob
from pathlib import Path


def main():
    idx = []
    for f in sorted(glob('src/data/questions.*.json')):
        for q in json.loads(Path(f).read_text(encoding='utf-8')):
            row = {'id': q['id'], 'year': q['year'], 'num': q['num'], 'subject': q['subject']}
            if q.get('topic'):  # 考點(若已分類),供首頁/篩選/搜尋用,免載整年題庫
                row['topic'] = q['topic']
            idx.append(row)
    idx.sort(key=lambda q: (q['year'], q['num']))
    Path('src/data/index.json').write_text(
        json.dumps(idx, ensure_ascii=False), encoding='utf-8')
    print(f'索引題數: {len(idx)} → src/data/index.json')


if __name__ == '__main__':
    main()
