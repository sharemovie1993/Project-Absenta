with open(r'd:\BarayaProject\Project Absenta\absenta_backend\src\database\seeds\seed.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'menu', text, re.IGNORECASE)
print('Occurrences of menu in seed.ts:', len(matches))
