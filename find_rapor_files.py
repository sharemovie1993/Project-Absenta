import os

for root, dirs, files in os.walk(r'd:\BarayaProject\Project Absenta\absenta_backend\src\modules\rapor'):
    for f in files:
        print(os.path.join(root, f))
