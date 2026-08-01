import os

for root, dirs, files in os.walk(r'd:\BarayaProject\Project Absenta\absenta_backend\src\modules\academic'):
    for f in files:
        if 'jadwal' in f.lower() or 'kbm' in f.lower():
            print(os.path.join(root, f))
