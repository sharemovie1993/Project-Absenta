with open(r'd:\BarayaProject\Project Absenta\absenta_backend\prisma\schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if line.startswith('model Tenant ') or line.startswith('model MitraIndustri ') or line.startswith('model Jurusan '):
        print(f'Line {idx+1:4d}: {line.strip()}')
