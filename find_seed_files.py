import os

for root, dirs, files in os.walk(r'd:\BarayaProject\Project Absenta\absenta_backend'):
    for f in files:
        if 'seed' in f.lower():
            print(os.path.join(root, f))
