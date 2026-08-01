with open(r'd:\BarayaProject\Project Absenta\absenta_frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'hubin' in line.lower() or 'pkl' in line.lower():
        print(f'Line {idx+1:4d}: {line.strip()}')
