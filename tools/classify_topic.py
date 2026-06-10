#!/usr/bin/env python3
"""依「考點(topic)」替題目標上次分類(單一主考點,英文/縮寫)。

目前為試點:只處理 subject=心臟血管。比對「題幹+選項+詳解」文字的關鍵字,
以加權計分挑出最相符的考點;都不中則歸 Other-CV。詳解文字資訊量大、最能反映考點,
故一併納入比對(只讀不改詳解)。

用法:
  python3 tools/classify_topic.py --subject 心臟血管 --dry-run   # 只看分佈、不寫檔
  python3 tools/classify_topic.py --subject 心臟血管             # 寫回 questions.<年>.json
改完務必重建索引: python3 tools/build_index.py
"""
import json, argparse, re
from glob import glob
from pathlib import Path

# 各科考點分類法(關鍵字 → topic)。順序即優先序(同分時排前者勝)。
# 關鍵字大小寫不敏感;中英文混用,盡量涵蓋題幹/選項/詳解常見措辭。
TAXO = {
    '心臟血管': [
        ('ACS', ['acute coronary', 'stemi', 'nstemi', 'unstable angina', 'myocardial infarction',
                 '心肌梗塞', '急性冠', '冠心', 'troponin', '肌鈣蛋白', 'culprit', '血栓溶解',
                 'thromboly', 'primary pci', 'ticagrelor', 'dapt', '雙抗', 'killip']),
        ('HF', ['heart failure', '心衰竭', '心臟衰竭', 'hfref', 'hfpef', 'ejection fraction',
                '射出分率', 'gdmt', 'sacubitril', 'arni', 'ivabradine', 'nt-probnp', 'bnp',
                'cardiogenic shock', '心因性休克', 'diastolic dysfunction']),
        ('Arrhythmia', ['arrhythmia', '心律不整', 'atrial fibrillation', '心房顫動', 'atrial flutter',
                        '心房撲動', 'ventricular tachycardia', '心室頻脈', '心室頻速', 'bradycardia',
                        '緩脈', 'pacemaker', '節律器', 'wpw', 'long qt', 'brugada', 'svt', 'av block',
                        '房室阻斷', 'cha2ds2', 'ablation', '電燒', 'icd', 'sudden cardiac death',
                        '猝死', 'palpitation', '心悸', 'digoxin', 'amiodarone']),
        ('VHD', ['valvular', '瓣膜', 'aortic stenosis', 'mitral regurgitation', 'mitral stenosis',
                 'aortic regurgitation', '主動脈瓣', '二尖瓣', '三尖瓣', 'tavr', 'tavi',
                 'valve replacement', '置換瓣膜', 'rheumatic heart', '風濕性心', 'corrigan',
                 'quincke', 'mitral valve prolapse', '瓣膜脫垂', 'regurgitant', 'stenotic valve']),
        ('HTN', ['hypertension', '高血壓', 'blood pressure', '血壓', 'antihypertensive', '降壓',
                 'secondary hypertension', 'renovascular', 'hypertensive emergency',
                 'hypertensive urgency', '高血壓急症', 'jnc', 'resistant hypertension']),
        ('Cardiomyopathy', ['cardiomyopathy', '心肌病', 'hypertrophic', 'hcm', 'dilated cardiomyopathy',
                            'dcm', 'restrictive cardiomyopathy', 'amyloid', '類澱粉', 'myocarditis',
                            '心肌炎', 'takotsubo']),
        ('Pericardial', ['pericard', '心包', 'tamponade', '填塞', 'constrictive', 'pericardial effusion']),
        ('IE', ['endocarditis', '心內膜炎', 'duke criteria', 'vegetation', '贅生物', 'hacek']),
        ('ACHD', ['congenital heart', '先天性心', 'atrial septal defect', 'ventricular septal defect',
                  'patent ductus', 'tetralogy', 'eisenmenger', 'coarctation', 'asd', 'vsd', 'pda']),
        ('Lipid-Prev', ['lipid', '血脂', 'cholesterol', '膽固醇', 'ldl', 'statin', '他汀', 'dyslipidemia',
                        'ascvd', 'primary prevention', '初級預防', 'triglyceride', '三酸甘油',
                        'ezetimibe', 'pcsk9']),
        ('Vascular', ['aortic dissection', '主動脈剝離', 'aneurysm', '動脈瘤', 'peripheral artery',
                      '周邊動脈', 'claudication', '跛行', 'abi', 'carotid', '頸動脈', 'aortic',
                      'marfan']),
        ('PH', ['pulmonary hypertension', '肺動脈高壓', '肺高壓', 'pah', 'mean pulmonary arterial']),
        ('Syncope', ['syncope', '暈厥', 'tilt table', 'vasovagal', 'orthostatic']),
    ],
}
FALLBACK = {'心臟血管': 'Other-CV'}


def classify(text, rules):
    best, best_score = None, 0
    low = text.lower()
    for topic, kws in rules:
        score = sum(low.count(k.lower()) for k in kws)
        if score > best_score:
            best, best_score = topic, score
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--subject', required=True)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    rules = TAXO[args.subject]
    fb = FALLBACK.get(args.subject, 'Other')

    # 預載各年詳解(只讀,用於增強分類)
    expl = {}
    for f in glob('src/data/explanations.*.json'):
        for k, v in json.loads(Path(f).read_text(encoding='utf-8')).items():
            expl[k] = v.get('text', '')

    from collections import Counter
    dist = Counter()
    samples = {}
    changed = 0
    for f in sorted(glob('src/data/questions.*.json')):
        qs = json.loads(Path(f).read_text(encoding='utf-8'))
        dirty = False
        for q in qs:
            if q.get('subject') != args.subject:
                continue
            blob = q['question'] + ' ' + ' '.join(q.get('options', [])) + ' ' + expl.get(q['id'], '')
            topic = classify(blob, rules) or fb
            dist[topic] += 1
            samples.setdefault(topic, []).append(q['id'])
            if not args.dry_run and q.get('topic') != topic:
                q['topic'] = topic
                dirty = True; changed += 1
        if dirty and not args.dry_run:
            Path(f).write_text(json.dumps(qs, ensure_ascii=False, indent=1), encoding='utf-8')

    print(f'=== {args.subject} 考點分佈(共 {sum(dist.values())} 題) ===')
    for t, n in dist.most_common():
        ex = '、'.join(samples[t][:6])
        print(f'  {t:14s} {n:3d}   e.g. {ex}')
    if args.dry_run:
        print('\n(dry-run,未寫檔)')
    else:
        print(f'\n已寫入 topic 欄位:{changed} 題。記得重建索引: python3 tools/build_index.py')


if __name__ == '__main__':
    main()
