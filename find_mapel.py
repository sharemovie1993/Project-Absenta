with open(r'd:\BarayaProject\Project Absenta\absenta_backend\prisma\schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if line.startswith('model Mapel ') or line.startswith('model Mapel{'):
        print(f'Mapel found at line {idx+1}')
    if line.startswith('model NilaiSiswa '):
        print(f'NilaiSiswa found at line {idx+1}')
