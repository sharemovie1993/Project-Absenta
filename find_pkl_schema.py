with open(r'd:\BarayaProject\Project Absenta\absenta_backend\prisma\schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'Pkl' in line or 'PKL' in line or 'Hubin' in line or 'Sertifikat' in line:
        print(f'Line {idx+1:4d}: {line.strip()}')
