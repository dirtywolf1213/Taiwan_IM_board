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
    '消化': [
        ('Esophagus', ['esophag', '食道', 'gerd', '胃食道逆流', 'achalasia', '賁門', 'barrett', 'dysphagia',
                       '吞嚥困難', 'eosinophilic esophagitis']),
        ('PUD', ['peptic ulcer', '消化性潰瘍', 'helicobacter', '幽門螺旋桿菌', '幽門桿菌', 'gastritis', '胃炎',
                 'zollinger', 'duodenal ulcer', 'gastric ulcer']),
        ('IBD', ['inflammatory bowel', '發炎性腸道', 'crohn', '克隆', 'ulcerative colitis', '潰瘍性結腸炎',
                 '潰瘍性大腸炎']),
        ('Colon', ['colorectal', '大腸癌', '結腸', 'colon cancer', 'colonoscopy', 'colon polyp', '息肉',
                   'diverticul', '憩室', 'adenomatous polyp', 'lynch']),
        ('Functional', ['irritable bowel', '腸躁', 'functional dyspepsia', 'constipation', '便秘',
                        'functional gastrointestinal']),
        ('GIBleed', ['gastrointestinal bleeding', '腸胃道出血', '消化道出血', 'hematochezia', 'melena', '黑便',
                     'occult blood', 'angiodysplasia', 'small bowel bleeding', 'variceal bleeding']),
        ('Pancreas', ['pancreatitis', '胰臟炎', 'pancreatic cancer', '胰臟癌', '胰臟腺癌', 'ipmn',
                      'pancreatic adenocarcinoma']),
        ('Biliary', ['cholangitis', '膽管炎', 'cholecystitis', '膽囊炎', 'gallstone', '膽結石',
                     'choledocholithiasis', '膽道', 'primary sclerosing', 'biliary', 'gallbladder', '膽囊']),
        ('Hepatitis', ['hepatitis b', 'hepatitis c', 'hepatitis a', '肝炎', 'hbv', 'hcv', 'viral hepatitis',
                       'autoimmune hepatitis', '病毒性肝炎', 'hbsag']),
        ('Cirrhosis', ['cirrhosis', '肝硬化', 'portal hypertension', '門脈高壓', '門靜脈高壓', 'ascites', '腹水',
                       'esophageal varices', '食道靜脈瘤', 'hepatic encephalopathy', '肝性腦病', 'hepatorenal',
                       'spontaneous bacterial peritonitis']),
        ('Liver-Other', ['hepatocellular carcinoma', '肝細胞癌', '肝癌', 'nafld', '脂肪肝', 'fatty liver',
                         'wilson disease', 'hemochromatosis', '血色素沈著', 'liver mass', 'liver abscess', '肝膿瘍']),
        ('Malabsorption', ['celiac', '乳糜瀉', 'malabsorption', '吸收不良', 'whipple', 'sibo', 'bile acid',
                           'chronic diarrhea', '慢性腹瀉']),
    ],
    '腎臟': [
        ('AKI', ['acute kidney injury', '急性腎損傷', '急性腎衰竭', 'acute tubular necrosis', 'contrast-induced',
                 '顯影劑', 'prerenal', 'rhabdomyolysis', '橫紋肌溶解']),
        ('CKD', ['chronic kidney disease', '慢性腎臟病', 'ckd-mbd', 'end-stage renal', '尿毒', 'esrd',
                 'estimated gfr', 'uremia']),
        ('GN', ['glomerulonephritis', '腎絲球腎炎', 'nephrotic', '腎病症候群', 'nephritic', 'iga nephropathy',
                'membranous nephropathy', 'focal segmental', 'minimal change', 'lupus nephritis', '狼瘡腎炎',
                'glomerular', 'proteinuria', '蛋白尿']),
        ('Electrolyte', ['hyponatremia', '低血鈉', 'hypernatremia', '高血鈉', 'hyperkalemia', '高血鉀',
                         'hypokalemia', '低血鉀', 'hypercalcemia', 'hypocalcemia', 'hypophosphatemia',
                         'hypomagnesemia', 'siadh', '電解質']),
        ('AcidBase', ['acid-base', '酸鹼', 'metabolic acidosis', '代謝性酸中毒', 'renal tubular acidosis',
                      '腎小管酸中毒', 'metabolic alkalosis', 'anion gap', '陰離子間隙', 'osmolar gap']),
        ('Stone', ['kidney stone', '腎結石', 'nephrolithiasis', 'urolithiasis', '尿路結石', '輸尿管結石']),
        ('TubuloInterstitial', ['interstitial nephritis', '間質性腎炎', 'tubulointerstitial', 'fanconi',
                                'polycystic kidney', '多囊腎', 'adpkd', 'renal cyst']),
        ('Dialysis-Tx', ['dialysis', '透析', 'hemodialysis', 'peritoneal dialysis', '腹膜透析', '血液透析',
                         'kidney transplant', '腎臟移植', 'encapsulating peritoneal']),
        ('HTN-Renal', ['renovascular', '腎血管', 'secondary hypertension', 'resistant hypertension',
                       'renal artery stenosis', '腎動脈狹窄']),
    ],
    '胸腔': [
        ('Asthma', ['asthma', '氣喘', 'gina', 'bronchospasm', 'bronchial hyperreactivity']),
        ('COPD', ['copd', '慢性阻塞性肺病', 'emphysema', '肺氣腫', 'chronic bronchitis', '慢性支氣管炎', 'gold ']),
        ('Pneumonia', ['pneumonia', '肺炎', 'community-acquired', 'ventilator-associated', 'legionella',
                       'aspiration pneumonia']),
        ('LungCancer', ['lung cancer', '肺癌', 'non-small cell', 'small cell lung', 'solitary pulmonary nodule',
                        '肺結節', 'mesothelioma', '間皮瘤', '肺腺癌', 'bronchogenic']),
        ('ILD', ['interstitial lung', '間質性肺', 'pulmonary fibrosis', '肺纖維化', 'idiopathic pulmonary fibrosis',
                 'sarcoidosis', '類肉瘤', 'hypersensitivity pneumonitis', '過敏性肺炎']),
        ('Pleural', ['pleural effusion', '肋膜積液', '胸水', '肋膜積水', 'pneumothorax', '氣胸', 'empyema', '膿胸',
                     'light criteria', '肋膜']),
        ('PE-PHTN', ['pulmonary embolism', '肺栓塞', 'pulmonary hypertension', '肺動脈高壓', '肺高壓',
                     'pulmonary thromboembolism']),
        ('ARDS-Vent', ['ards', 'acute respiratory distress', '急性呼吸窘迫', 'respiratory failure', '呼吸衰竭',
                       'mechanical ventilation', '呼吸器', '機械通氣']),
        ('OSA', ['obstructive sleep apnea', '睡眠呼吸中止', 'osahs', 'cpap', '阻塞性睡眠']),
        ('TB-Bronchiectasis', ['pulmonary tuberculosis', '肺結核', 'nontuberculous', 'bronchiectasis',
                               '支氣管擴張']),
    ],
    '新陳代謝與內分泌': [
        ('Diabetes', ['diabetes', '糖尿病', 'hba1c', 'insulin', '胰島素', 'diabetic ketoacidosis',
                      'hyperglycemic', 'hypoglycemia', '低血糖', 'sglt2', 'glp-1', 'metformin', '血糖']),
        ('Thyroid', ['thyroid', '甲狀腺', 'hyperthyroid', '甲狀腺亢進', 'hypothyroid', '甲狀腺低下', 'graves',
                     'thyroid nodule', 'thyroiditis', 'thyrotoxic', 'tsh']),
        ('Adrenal', ['adrenal', '腎上腺', 'cushing', '庫欣', 'addison', 'adrenal insufficiency',
                     'pheochromocytoma', '嗜鉻細胞瘤', 'primary aldosteronism', '醛固酮', 'incidentaloma',
                     'hyperaldosteron']),
        ('Pituitary', ['pituitary', '腦下垂體', 'acromegaly', '肢端肥大', 'prolactin', '泌乳素', 'hypopituitar',
                       'diabetes insipidus', '尿崩', 'growth hormone']),
        ('BoneCalcium', ['osteoporosis', '骨質疏鬆', 'hyperparathyroid', '副甲狀腺', 'hypercalcemia', '高血鈣',
                         'vitamin d', 'parathyroid hormone', 'paget', 'bone mineral density']),
        ('Lipid', ['lipid', '血脂', 'cholesterol', '膽固醇', 'dyslipidemia', 'triglyceride', '三酸甘油',
                   'hypertriglyceridemia', 'ldl', 'statin']),
        ('Gonadal', ['hypogonadism', '性腺低下', 'testosterone', '睪固酮', 'polycystic ovary', 'gynecomastia',
                     '男性女乳', 'amenorrhea', '無月經']),
        ('NET-MEN', ['neuroendocrine', 'multiple endocrine neoplasia', '多發性內分泌', 'carcinoid', 'gastrinoma',
                     'insulinoma', 'vipoma', 'glucagonoma']),
        ('Obesity-Metab', ['obesity', '肥胖', 'metabolic syndrome', '代謝症候群', 'bariatric']),
    ],
    '血液腫瘤': [
        ('Anemia', ['anemia', '貧血', 'iron deficiency', '缺鐵', 'thalassemia', '地中海貧血', 'vitamin b12',
                    'folate', 'hemolytic', '溶血', 'aplastic anemia', '再生不良', 'g6pd', 'spherocytosis']),
        ('Leukemia', ['leukemia', '白血病', 'acute myeloid', 'acute lymphoblastic', 'chronic myeloid',
                      'chronic lymphocytic', 'myeloid leukemia', 'blast']),
        ('Lymphoma', ['lymphoma', '淋巴瘤', 'hodgkin', '何杰金', 'non-hodgkin', 'diffuse large b-cell',
                      '淋巴癌']),
        ('Myeloma', ['myeloma', '骨髓瘤', 'mgus', 'plasma cell', 'amyloidosis', '類澱粉', '漿細胞']),
        ('MPN-MDS', ['myeloproliferative', 'polycythemia vera', '真性紅血球', 'essential thrombocythemia',
                     'myelofibrosis', '骨髓纖維化', 'myelodysplastic', 'jak2', '骨髓增生']),
        ('Bleeding-Coag', ['hemophilia', '血友病', 'von willebrand', 'disseminated intravascular',
                           'thrombocytopenia', '血小板低下', '血小板減少', 'immune thrombocytopenic',
                           'thrombotic thrombocytopenic', '凝血', 'coagulopathy', '出血傾向']),
        ('Thrombosis', ['venous thromboembolism', '靜脈血栓', 'deep vein thrombosis', 'anticoagulation', '抗凝',
                        'thrombophilia', 'antiphospholipid', '血栓形成']),
        ('Transfusion', ['transfusion', '輸血', 'blood product', 'trali', 'cryoprecipitate', 'packed red',
                         '血品']),
        ('SolidTumor', ['breast cancer', '乳癌', 'prostate cancer', '攝護腺', 'melanoma', '黑色素瘤',
                        'renal cell carcinoma', '腎細胞癌', 'paraneoplastic', '副腫瘤', 'cancer of unknown',
                        'metastasis', '轉移', 'chemotherapy', '化療', 'immunotherapy', 'recist', 'tumor marker',
                        'pancoast', 'nasopharyngeal']),
    ],
    '神經': [
        ('Stroke', ['stroke', '中風', 'ischemic stroke', 'intracerebral hemorrhage', '腦出血', '腦梗塞',
                    'transient ischemic', 'thrombolysis', 'subarachnoid', '蜘蛛膜下', 'amaurosis']),
        ('Seizure', ['seizure', '癲癇', 'epilepsy', 'status epilepticus', 'convulsion']),
        ('Headache', ['headache', '頭痛', 'migraine', '偏頭痛', 'cluster headache', 'tension-type']),
        ('Movement', ['parkinson', '巴金森', 'tremor', '顫抖', 'dystonia', 'huntington', 'movement disorder',
                      'restless leg', '不寧腿']),
        ('Dementia', ['dementia', '失智', 'alzheimer', '阿茲海默', 'cognitive impairment', 'lewy body',
                      'frontotemporal']),
        ('Neuromuscular', ['myasthenia', '重症肌無力', 'guillain', '神經病變', 'peripheral neuropathy',
                           'amyotrophic lateral', '肌萎縮性', 'myopathy', 'neuromuscular', 'radiculopathy']),
        ('Demyelinating', ['multiple sclerosis', '多發性硬化', 'neuromyelitis', 'demyelinat', 'optic neuritis']),
        ('CNS-Other', ['meningitis', '腦膜炎', 'encephalitis', '腦炎', 'spinal cord', '脊髓', 'vertigo', '眩暈',
                       'wernicke', 'cerebral venous', 'myelopathy']),
    ],
    '精神': [
        ('Mood', ['depression', '憂鬱', 'major depressive', 'bipolar', '躁鬱', 'mania', 'mood disorder',
                  'dysthymia']),
        ('Psychosis', ['schizophrenia', '思覺失調', '精神分裂', 'psychosis', 'psychotic', 'delusion', '妄想',
                       'antipsychotic', 'hallucination', '幻覺']),
        ('Anxiety', ['anxiety', '焦慮', 'panic disorder', 'obsessive-compulsive', '強迫症', 'ptsd',
                     'post-traumatic', 'phobia', '恐慌']),
        ('Substance', ['substance use', '物質使用', 'alcohol use', '酒精', 'alcohol withdrawal', 'addiction',
                       '成癮', 'withdrawal', '戒斷', 'opioid', 'delirium tremens']),
        ('Delirium', ['delirium', '譫妄', 'neurocognitive disorder', 'acute confusional']),
        ('PsychPharm', ['ssri', 'antidepressant', '抗憂鬱', 'lithium', '鋰鹽', 'serotonin syndrome',
                        'neuroleptic malignant', 'benzodiazepine', 'mood stabilizer', 'tricyclic']),
        ('Sleep', ['insomnia', '失眠', 'sleep disorder', 'narcolepsy']),
        ('Suicide-Other', ['suicide', '自殺', 'eating disorder', '飲食疾患', 'anorexia', 'somatic symptom',
                           'personality disorder', '人格', 'grief', '哀慟']),
    ],
    '皮膚': [
        ('Drug-Eruption', ['drug eruption', '藥物疹', 'stevens-johnson', '史蒂芬', 'toxic epidermal',
                           'dress', 'erythema multiforme', '多形性紅斑', 'drug reaction']),
        ('Bullous', ['pemphigus', '天疱瘡', 'bullous pemphigoid', '類天疱瘡', 'blistering', 'autoimmune bullous',
                     'dermatitis herpetiformis']),
        ('Psoriasis-Eczema', ['psoriasis', '乾癬', 'eczema', '濕疹', 'atopic dermatitis', '異位性皮膚炎',
                              'seborrheic dermatitis', 'contact dermatitis']),
        ('Infection-Skin', ['herpes zoster', '帶狀疱疹', 'cellulitis', '蜂窩', 'tinea', '黴菌', 'scabies', '疥瘡',
                            'wart', '疣', 'impetigo', 'candidiasis', '念珠菌', 'molluscum']),
        ('SkinCancer', ['melanoma', '黑色素瘤', 'basal cell carcinoma', '基底細胞', 'squamous cell carcinoma',
                        '鱗狀細胞', 'skin cancer', 'cutaneous lymphoma', 'mycosis fungoides', 'actinic keratosis']),
        ('Pigment-Hair', ['vitiligo', '白斑', 'alopecia', '落髮', '禿', 'melasma', 'pigmentation', '色素']),
        ('Connective-Derm', ['cutaneous lupus', '皮膚紅斑', 'photosensitivity', '光敏感', 'discoid lupus',
                             'erythema nodosum', '結節性紅斑']),
        ('Urticaria-Other', ['urticaria', '蕁麻疹', 'acne', '痤瘡', '青春痘', 'rosacea', '酒糟', 'pruritus', '搔癢']),
    ],
}
FALLBACK = {
    '心臟血管': 'Other-CV', '感染': 'Other-ID', '風濕免疫及過敏': 'Other-Rheum',
    '消化': 'Other-GI', '腎臟': 'Other-Renal', '胸腔': 'Other-Chest',
    '新陳代謝與內分泌': 'Other-Endo', '血液腫瘤': 'Other-Heme', '神經': 'Other-Neuro',
    '精神': 'Other-Psych', '皮膚': 'Other-Derm',
}


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
