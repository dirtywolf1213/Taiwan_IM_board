#!/usr/bin/env python3
"""把附圖 PDF 中各題的圖區域裁切成 PNG,並回填題庫 JSON 的 image 欄位。

附圖 PDF 以「第 N 題」標記,部分題的圖由多張影像組成。裁切框為該題所有
影像矩形的聯集(取自 PyMuPDF get_image_rects),經人工核對版面後固定。

用法:
    python tools/extract_figures.py --year 114
"""
import argparse
import json
from pathlib import Path

import fitz  # PyMuPDF

# year -> [(pdf 檔名, 頁碼0起, 題號, x0, y0, x1, y1), ...]
# 座標為 PDF point(612x792),已對照渲染畫面核對。
LAYOUT = {
    114: [
        ('圖_114-1.pdf', 0, 130, 79, 114, 484, 431),
        ('圖_114-1.pdf', 0, 131, 79, 468, 417, 738),
        ('圖_114-1.pdf', 1, 157, 79, 114, 299, 380),
        ('圖_114-1.pdf', 1, 158, 79, 420, 536, 736),
        ('圖_114-1.pdf', 2, 159, 79, 114, 543, 398),
        ('圖_114-1.pdf', 2, 160, 79, 492, 536, 659),
        ('圖_114-2.pdf', 0, 9,  60, 115, 496, 363),
        ('圖_114-2.pdf', 0, 26, 60, 405, 283, 666),
        ('圖_114-2.pdf', 0, 27, 309, 400, 555, 654),
        ('圖_114-2.pdf', 1, 34, 60, 116, 556, 293),
        ('圖_114-2.pdf', 1, 36, 60, 353, 354, 549),
        ('圖_114-2.pdf', 2, 44, 60, 117, 257, 293),
        ('圖_114-2.pdf', 2, 54, 268, 112, 518, 365),
        ('圖_114-2.pdf', 2, 68, 60, 400, 444, 721),
    ],
}

PAD = 6      # 裁切框留白(point)
DPI = 200    # 輸出解析度


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--src', default='source-pdfs')
    ap.add_argument('--out', default='public/images')
    ap.add_argument('--json', default=None)
    args = ap.parse_args()

    year = args.year
    src_dir = Path(args.src) / str(year)
    out_dir = Path(args.out) / str(year)
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = Path(args.json or f'src/data/questions.{year}.json')

    docs = {}
    paths = {}  # num -> 相對於 public 的路徑
    for pdf, page, num, x0, y0, x1, y1 in LAYOUT[year]:
        if pdf not in docs:
            docs[pdf] = fitz.open(src_dir / pdf)
        p = docs[pdf][page]
        clip = fitz.Rect(x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD) & p.rect
        pix = p.get_pixmap(clip=clip, matrix=fitz.Matrix(DPI / 72, DPI / 72))
        fn = out_dir / f'{num}.png'
        pix.save(fn)
        paths[num] = f'images/{year}/{num}.png'
        print(f'  Q{num}: {fn} ({pix.width}x{pix.height})')

    # 回填 JSON
    qs = json.loads(json_path.read_text(encoding='utf-8'))
    patched = 0
    for q in qs:
        if q['num'] in paths:
            q['image'] = paths[q['num']]
            q['needsImage'] = True
            patched += 1
    json_path.write_text(json.dumps(qs, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'已裁切 {len(paths)} 張、回填 {patched} 題 → {json_path}')


if __name__ == '__main__':
    main()
