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
    '感染': [
        ('HIV', ['hiv', 'aids', '愛滋', 'antiretroviral', 'cd4', 'opportunistic infection',
                 'pneumocystis', 'kaposi', 'highly active anti']),
        ('TB', ['tuberculosis', '結核', 'mycobacterium tuberculosis', 'latent tb', 'ltbi', 'igra',
                'rifampin', 'rifapentine', 'isoniazid', 'ethambutol', 'pyrazinamide', 'mdr-tb',
                'directly observed', '抗結核']),
        ('Endocarditis', ['endocarditis', '心內膜炎', 'duke criteria', 'vegetation', '贅生物']),
        ('CNS', ['meningitis', '腦膜炎', 'encephalitis', '腦炎', 'brain abscess', '腦膿瘍',
                 'cerebrospinal fluid', '腦脊髓液']),
        ('Sepsis', ['sepsis', '敗血', 'septic shock', 'surviving sepsis', 'bacteremia', '菌血症',
                    'qsofa']),
        ('Fungal', ['candida', '念珠菌', 'aspergillus', '麴菌', 'cryptococc', '隱球菌',
                    'invasive fungal', '侵襲性黴菌', 'histoplasm', 'mucor', 'pneumocystis jirovecii',
                    'amphotericin']),
        ('Pneumonia', ['pneumonia', '肺炎', 'community-acquired pneumonia', 'hospital-acquired pneumonia',
                       'ventilator-associated', 'influenza', '流感', 'legionella', 'empyema', '膿胸']),
        ('UTI', ['urinary tract infection', '泌尿道感染', 'pyelonephritis', '腎盂腎炎', 'cystitis',
                 'catheter-associated urinary', 'asymptomatic bacteriuria', '無症狀菌尿']),
        ('GI-Infx', ['diarrhea', '腹瀉', 'clostridioides difficile', 'clostridium difficile',
                     'c. difficile', 'gastroenteritis', '腸胃炎', 'food poisoning', '食物中毒',
                     'salmonella', 'shigella', 'campylobacter', 'cholera', '霍亂', 'typhoid', '傷寒',
                     'helicobacter']),
        ('SSTI', ['cellulitis', '蜂窩', 'necrotizing fasciitis', '壞死性筋膜炎', 'osteomyelitis',
                  '骨髓炎', 'septic arthritis', '化膿性關節炎', 'diabetic foot', '糖尿病足']),
        ('STI', ['sexually transmitted', '性傳染', 'syphilis', '梅毒', 'gonorrhea', '淋病',
                 'chlamydia', 'treponema']),
        ('Zoonosis', ['leptospir', '鉤端螺旋體', 'scrub typhus', '恙蟲', 'rickettsia', 'q fever',
                      'brucell', 'malaria', '瘧疾', 'melioidosis', '類鼻疽', 'plague', '鼠疫',
                      'anthrax', '炭疽', 'hantavirus']),
        ('Vaccine', ['vaccine', '疫苗', 'immunization', '預防接種', 'post-exposure prophylaxis',
                     'pre-exposure prophylaxis', 'travel medicine', 'rabies', '狂犬']),
        ('Viral', ['dengue', '登革', 'zika', 'measles', '麻疹', 'rubella', 'sars-cov', 'coronavirus',
                   'cytomegalovirus', 'epstein-barr', 'varicella', '水痘', 'mumps', '腮腺炎', 'ebola',
                   'avian influenza', '禽流感', 'h7n9', 'h5n1', 'herpes simplex']),
        ('Resistance', ['mrsa', 'vancomycin-resistant enterococ', 'vre ', 'esbl', 'carbapenem-resistant',
                        'multidrug-resistant', '多重抗藥', 'methicillin-resistant', '抗藥性']),
        ('Antibiotics', ['drug of choice', 'spectrum of activity', 'beta-lactam', 'cephalosporin', '頭孢',
                         'aminoglycoside', 'fluoroquinolone', 'vancomycin', '萬古黴素', 'macrolide',
                         'carbapenem', 'antimicrobial stewardship', 'minimum inhibitory']),
    ],
    '風濕免疫及過敏': [
        ('SLE', ['lupus', '紅斑性狼瘡', '系統性紅斑', 'anti-dsdna', 'anti-ds-dna', 'antinuclear antibody',
                 'anti-smith', 'lupus nephritis', '狼瘡腎炎']),
        ('RA', ['rheumatoid arthritis', '類風濕', 'anti-ccp', 'anti-citrullinated', 'rheumatoid factor',
                'pannus']),
        ('Vasculitis', ['vasculitis', '血管炎', 'anca', 'granulomatosis with polyangiitis', 'wegener',
                        'microscopic polyangiitis', 'eosinophilic granulomatosis', 'churg-strauss',
                        'giant cell arteritis', '巨細胞動脈炎', 'takayasu', '高安', 'polyarteritis nodosa',
                        'behcet', 'behçet', '貝西氏', 'henoch', 'iga vasculitis', 'kawasaki', '川崎',
                        'cryoglobulin']),
        ('SSc', ['systemic sclerosis', 'scleroderma', '硬皮症', 'anti-scl-70', 'anti-topoisomerase',
                 'anticentromere', 'raynaud', '雷諾']),
        ('Gout', ['gout', '痛風', 'uric acid', '尿酸', 'allopurinol', 'febuxostat', 'colchicine', '秋水仙',
                  'cppd', 'pseudogout', '假性痛風', 'monosodium urate', 'tophi']),
        ('SpA', ['ankylosing spondylitis', '僵直性脊椎炎', 'spondyloarthritis', 'hla-b27',
                 'psoriatic arthritis', '乾癬性關節炎', 'reactive arthritis', '反應性關節炎', 'enthesitis',
                 'sacroiliitis', '薦腸關節']),
        ('Myositis', ['myositis', '肌炎', 'dermatomyositis', '皮肌炎', 'polymyositis', '多發性肌炎',
                      'anti-jo-1', 'anti-jo1', 'anti-mda5', 'inclusion body myositis',
                      'immune-mediated necrotizing']),
        ('Sjogren', ['sjögren', 'sjogren', '乾燥症', 'anti-ro', 'anti-la', 'anti-ssa', 'anti-ssb', 'sicca']),
        ('APS', ['antiphospholipid', '抗磷脂', 'lupus anticoagulant', 'anticardiolipin', 'anti-beta2',
                 'beta-2 glycoprotein', 'β2-glycoprotein']),
        ('IgG4', ['igg4-related', 'igg4 related', 'igg4-rd']),
        ('Still-AutoInflam', ['adult-onset still', "still's disease", '史迪爾', 'familial mediterranean fever',
                              '家族性地中海熱', 'autoinflammatory', 'periodic fever', 'macrophage activation']),
        ('Immunodef', ['immunodeficiency', '免疫缺乏', 'complement deficiency', '補體缺', 'common variable',
                       'hereditary angioedema', '遺傳性血管性水腫', 'primary immunodef']),
        ('Allergy', ['urticaria', '蕁麻疹', 'anaphylaxis', '過敏性休克', 'angioedema', '血管性水腫',
                     'drug allergy', '藥物過敏', 'dress syndrome', 'eosinophil', '嗜酸',
                     'allergic rhinitis', '過敏性鼻炎', 'food allergy', 'mastocytosis', 'hypersensitivity']),
        ('OA-Soft', ['osteoarthritis', '退化性關節炎', 'fibromyalgia', '纖維肌痛', 'bursitis', 'tendinitis']),
    ],
}
FALLBACK = {'心臟血管': 'Other-CV', '感染': 'Other-ID', '風濕免疫及過敏': 'Other-Rheum'}


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
