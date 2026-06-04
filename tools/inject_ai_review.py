# -*- coding: utf-8 -*-
"""把 AI 審核結果(id|verdict|concern|suggestion)注入審核稿的「🤖 AI 審核」欄。
用法: python3 tools/inject_ai_review.py review/感染_114.md /tmp/verdicts_114.txt
"""
import re, sys
sheet, verdicts = sys.argv[1], sys.argv[2]
V = {}
for line in open(verdicts, encoding='utf-8'):
    if '|' not in line: continue
    p = [x.strip() for x in line.split('|')]
    if len(p) < 4: continue
    V[p[0]] = (p[1], p[2], p[3])
md = open(sheet, encoding='utf-8').read()
nok = sum(1 for v in V.values() if v[0].upper() == 'OK')
nflag = len(V) - nok

def repl(m):
    qid, body = m.group(1), m.group(2)
    if qid not in V: return m.group(0)
    verdict, concern, sugg = V[qid]
    badge = '✅ 看來正確' if verdict.upper() == 'OK' else '⚠️ 需確認'
    new_ai = (f'**🤖 AI 審核**：{badge}\n- 疑慮：{concern}\n- 建議：{sugg}\n')
    body2 = re.sub(r'\*\*🤖 AI 審核\*\*：.*?(?=\*\*🧑‍⚕️ 人工決定\*\*)', new_ai + '\n', body, flags=re.S)
    return f'<!--Q {qid}-->{body2}<!--/Q-->'

md2 = re.sub(r'<!--Q (\S+)-->(.*?)<!--/Q-->', repl, md, flags=re.S)
# 在標題下加一行統計
md2 = re.sub(r'(# 審核稿.*?\n)', rf'\1\n> 🤖 AI 初審完成:✅ 看來正確 {nok} 題 ・ ⚠️ 需確認 {nflag} 題（請優先看 ⚠️）\n', md2, count=1)
open(sheet, 'w', encoding='utf-8').write(md2)
print(f'已注入 AI 審核:OK {nok} / FLAG {nflag}')
