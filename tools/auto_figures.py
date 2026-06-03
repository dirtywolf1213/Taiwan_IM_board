#!/usr/bin/env python3
"""舊格式單一圖檔(圖_<年>.pdf)的半自動附圖裁切。

觀察:每頁「科目+題號」標籤數 = 圖片數,且依閱讀順序一一對應。
做法:逐頁將圖片與標籤各依閱讀順序排序後配對,(科,科題號)→全卷題號,
裁切每張圖(可同題多張→垂直拼接),輸出 public/images/<年>/<num>.png,
並回填 JSON。最後產生 contact sheet 供人工一次檢視。

用法: python3 tools/auto_figures.py --year 105
檢視:/tmp/contact_<年>.png
"""
import argparse
import io
import json
import re
from collections import OrderedDict, defaultdict
from pathlib import Path

import fitz
from PIL import Image, ImageDraw

LAB = re.compile(r'([一-鿿]{1,4}科)\s*第?\s*(\d+)\s*題')
PAD = 5
DPI = 200
ROWT = 16  # 同列 y 容差(point)


def secnum_map(year):
    qs = json.loads(Path(f'src/data/questions.{year}.json').read_text(encoding='utf-8'))
    seen = defaultdict(int)
    m = {}
    for q in qs:
        seen[q['sectionRaw']] += 1
        m[(q['sectionRaw'], seen[q['sectionRaw']])] = q['num']
    return m


def page_labels(page):
    """用 dict 的 line 結構抽標籤,每個 span 定位,可得每個標籤的 x,y。"""
    out = []
    d = page.get_text('dict')
    for block in d['blocks']:
        for line in block.get('lines', []):
            spans = line.get('spans', [])
            if not spans:
                continue
            text = ''.join(s['text'] for s in spans)
            # 建 char index -> x 對照
            idxx = []
            for s in spans:
                for _ in s['text']:
                    idxx.append(s['bbox'][0])
            y = line['bbox'][1]
            for mt in LAB.finditer(text):
                x = idxx[mt.start()] if mt.start() < len(idxx) else line['bbox'][0]
                out.append((mt.group(1), int(mt.group(2)), x, y))
    return out


def reading_key(x, y):
    return (round(y / ROWT), round(x))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--year', type=int, required=True)
    args = ap.parse_args()
    year = args.year

    smap = secnum_map(year)
    doc = fitz.open(f'source-pdfs/{year}/圖_{year}.pdf')

    groups = OrderedDict()   # num -> [(page, rect)]
    warnings = []
    for pno, page in enumerate(doc):
        imgs = []
        for im in page.get_images(full=True):
            for r in page.get_image_rects(im[0]):
                imgs.append(r)
        labels = page_labels(page)
        if not labels:
            if imgs:
                warnings.append(f'p{pno+1}: 有 {len(imgs)} 圖但無標籤')
            continue
        if len(imgs) != len(labels):
            warnings.append(f'p{pno+1}: 圖{len(imgs)}≠標籤{len(labels)}(需人工)')
        # 貪婪 1:1 最近配對(每標籤只用一次,避免搶配對)
        pairs = []
        for ii, r in enumerate(imgs):
            cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
            for li, l in enumerate(labels):
                pairs.append(((l[2] - cx) ** 2 + (l[3] - cy) ** 2, ii, li))
        pairs.sort()
        used_i, used_l = set(), set()
        for _, ii, li in pairs:
            if ii in used_i or li in used_l:
                continue
            used_i.add(ii)
            used_l.add(li)
            lab = labels[li]
            num = smap.get((lab[0], lab[1]))
            if num is None:
                warnings.append(f'p{pno+1}: 找不到 {lab[0]}{lab[1]}')
                continue
            groups.setdefault(num, []).append((pno, imgs[ii]))

    out_dir = Path(f'public/images/{year}')
    if out_dir.exists():
        for old in out_dir.glob('*.png'):
            old.unlink()
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {}
    for num, regions in groups.items():
        regions.sort(key=lambda pr: (pr[0], round(pr[1].y0 / ROWT), pr[1].x0))
        ims = []
        for pno, r in regions:
            clip = fitz.Rect(r.x0 - PAD, r.y0 - PAD, r.x1 + PAD, r.y1 + PAD) & doc[pno].rect
            pix = doc[pno].get_pixmap(clip=clip, matrix=fitz.Matrix(DPI / 72, DPI / 72))
            ims.append(Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB'))
        if len(ims) == 1:
            out = ims[0]
        else:
            w = max(i.width for i in ims)
            gap = 10
            out = Image.new('RGB', (w, sum(i.height for i in ims) + gap * (len(ims) - 1)), 'white')
            y = 0
            for i in ims:
                out.paste(i, (0, y))
                y += i.height + gap
        out.save(out_dir / f'{num}.png')
        paths[num] = f'images/{year}/{num}.png'

    # 回填 JSON
    jp = Path(f'src/data/questions.{year}.json')
    qs = json.loads(jp.read_text(encoding='utf-8'))
    for q in qs:
        q['image'] = paths.get(q['num'], '')   # 重設,避免殘留
        if q['num'] in paths:
            q['needsImage'] = True
    jp.write_text(json.dumps(qs, ensure_ascii=False, indent=2), encoding='utf-8')

    # contact sheet
    nums = sorted(paths)
    cols = 4
    cw, ch = 330, 320
    rows = (len(nums) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cw, rows * ch), 'white')
    dr = ImageDraw.Draw(sheet)
    for i, num in enumerate(nums):
        im = Image.open(out_dir / f'{num}.png')
        im.thumbnail((cw - 12, ch - 28))
        x = (i % cols) * cw
        y = (i // cols) * ch
        dr.text((x + 6, y + 4), f'Q{num}', fill='red')
        sheet.paste(im, (x + 8, y + 22))
    sheet.save(f'/tmp/contact_{year}.png')

    print(f'{year}: 裁切 {len(paths)} 題 → contact /tmp/contact_{year}.png')
    for w in warnings:
        print('  ⚠️', w)


if __name__ == '__main__':
    main()
