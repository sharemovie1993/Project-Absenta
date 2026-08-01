import os, re

for root, dirs, files in os.walk(r'd:\BarayaProject\Project Absenta\absenta_backend\src'):
    for f in files:
        if f.endswith('.ts'):
            fp = os.path.join(root, f)
            with open(fp, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                if 'jadwalKBM' in content or 'jadwalkbm' in content or 'JadwalKBM' in content:
                    print(fp)
