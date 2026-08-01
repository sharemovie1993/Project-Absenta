import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'd:\BarayaProject\Project Absenta\absenta_backend\src\database\seeds\seed.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'menu' in line.lower() or 'rapor' in line.lower() or 'pkl' in line.lower():
        print(f'Line {idx+1:4d}: {line.strip()[:80]}')
