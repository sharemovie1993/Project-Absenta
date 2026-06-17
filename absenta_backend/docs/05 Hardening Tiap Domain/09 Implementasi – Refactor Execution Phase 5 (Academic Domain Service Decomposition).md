Instruksi Implementasi – Refactor Execution Phase 5 (Academic Domain Service Decomposition)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Phase ini bertujuan memecah service besar pada academic domain, khususnya siswa.service.ts.

TARGET FILE

src/modules/academic/siswa/services/siswa.service.ts

LANGKAH IMPLEMENTASI

1. Buat struktur services baru:

services/
commands/
queries/
repositories/
event-handlers/

2. Pisahkan logic write (mutasi data) ke command handlers.

Contoh:

create student
update student
assign class
student promotion

3. Pisahkan logic read ke query handlers.

Contoh:

student list
student detail
student recap

4. Pindahkan semua akses prisma ke repository layer.

5. Controller hanya memanggil command/query handler melalui service layer.

6. Pastikan tidak ada file baru yang melebihi 1000 lines.

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Academic Domain Refactor – Phase 5
