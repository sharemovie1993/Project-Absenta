with open(r'd:\BarayaProject\Project Absenta\absenta_backend\src\modules\hubin\services\hubin.service.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'SiswaPkl' in line or 'NilaiPkl' in line or 'Sertifikat' in line or 'getPkl' in line or 'upsertPkl' in line:
        print(f'Line {idx+1:4d}: {line.strip()}')
