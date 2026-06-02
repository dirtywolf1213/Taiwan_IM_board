#!/usr/bin/env python3
"""為題庫標註科目(subject)。

台灣內科專科甄審題目特性(觀察 113、114 兩年):
- 題目按科目「連續成塊」排列,但每年各科題數略有差異(非固定題數)。
- 分兩堂:第一堂約 Q1-80、第二堂約 Q81-160。
- 每堂前段為乾淨的科目區塊;第一堂 Q73-80 多為「跨科整合題」,卷末神經/精神
  亦有交錯。這些以逐題方式覆寫。

分類依「題目主要臨床內容」歸入下列 11 類。整合題與跨科題的判定見 OVERRIDES,
若有不同見解可直接修改本檔後重跑。

用法: python tools/classify.py
"""
import json
from pathlib import Path

# 科目顯示順序(app 也用此順序)
SUBJECTS = [
    '心臟血管', '胸腔', '消化', '新陳代謝與內分泌', '腎臟',
    '風濕免疫及過敏', '血液腫瘤', '感染', '神經', '精神', '皮膚',
]


def block(mapping, a, b, subject):
    for n in range(a, b + 1):
        mapping[n] = subject


def build_114():
    m = {}
    block(m, 1, 17, '心臟血管')
    block(m, 18, 36, '胸腔')
    block(m, 37, 54, '消化')
    block(m, 55, 72, '腎臟')
    block(m, 81, 96, '感染')
    block(m, 97, 112, '新陳代謝與內分泌')
    block(m, 113, 128, '風濕免疫及過敏')
    block(m, 129, 144, '血液腫瘤')
    block(m, 156, 160, '皮膚')
    # 第一堂整合題 Q73-80(各屬不同科)
    over = {
        21: '精神',          # 神經阻斷性惡性症候群(NMS)
        73: '心臟血管',       # cardiogenic shock
        74: '胸腔',          # ARDS
        75: '消化',          # B肝肝硬化併發症
        76: '腎臟',          # 糖尿病腎病變 vs 非糖尿病腎絲球病變
        77: '感染',          # 潛伏結核篩檢
        78: '血液腫瘤',       # 缺鐵性貧血
        79: '新陳代謝與內分泌',  # 副甲狀腺與血鈣
        80: '血液腫瘤',       # 癌症免疫檢查點抑制劑
        # 卷末神經/精神
        145: '神經', 146: '神經', 147: '神經', 148: '神經', 149: '神經', 150: '神經',
        151: '精神', 152: '精神', 153: '精神', 154: '精神', 155: '精神',
    }
    m.update(over)
    return m


def build_113():
    m = {}
    block(m, 1, 18, '心臟血管')
    block(m, 19, 36, '胸腔')
    block(m, 37, 54, '消化')
    block(m, 55, 72, '腎臟')
    block(m, 81, 96, '感染')
    block(m, 97, 112, '新陳代謝與內分泌')
    block(m, 113, 128, '風濕免疫及過敏')
    block(m, 129, 144, '血液腫瘤')
    block(m, 156, 160, '皮膚')
    over = {
        73: '胸腔',          # 氣喘
        74: '新陳代謝與內分泌',  # 甲狀腺/腎上腺功能
        75: '新陳代謝與內分泌',  # 糖尿病合併代謝性酸中毒
        76: '胸腔',          # DLCO 下降原因
        77: '心臟血管',       # 主動脈閉鎖不全(雖底病為僵直性脊椎炎)
        78: '消化',          # 幽門桿菌 salvage therapy
        79: '新陳代謝與內分泌',  # pheochromocytoma
        80: '感染',          # 性病致病原
        145: '神經', 146: '神經', 147: '神經', 148: '精神', 149: '精神', 150: '神經',
        151: '精神', 152: '精神', 153: '精神', 154: '精神', 155: '精神',
    }
    m.update(over)
    return m


MAPS = {114: build_114(), 113: build_113()}


def main():
    for year, m in MAPS.items():
        path = Path(f'src/data/questions.{year}.json')
        qs = json.loads(path.read_text(encoding='utf-8'))
        missing = []
        counts = {s: 0 for s in SUBJECTS}
        for q in qs:
            subj = m.get(q['num'])
            if not subj:
                missing.append(q['num'])
                continue
            q['subject'] = subj
            counts[subj] += 1
        path.write_text(json.dumps(qs, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'=== {year} 年 ({len(qs)} 題) ===')
        for s in SUBJECTS:
            print(f'  {s}: {counts[s]}')
        if missing:
            print(f'  ⚠️ 未分類: {missing}')


if __name__ == '__main__':
    main()
