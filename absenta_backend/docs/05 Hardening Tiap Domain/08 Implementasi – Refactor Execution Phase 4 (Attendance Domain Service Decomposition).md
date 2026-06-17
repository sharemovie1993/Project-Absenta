Instruksi Implementasi – Refactor Execution Phase 4 (Attendance Domain Service Decomposition)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Phase ini bertujuan memecah service besar pada attendance domain agar boundary domain lebih jelas dan maintainable.

TARGET FILES

Service besar yang harus dipecah:

src/modules/attendance/gerbang/services/gerbang.service.ts
src/modules/attendance/sesi-absensi/services/sesi.service.ts

LANGKAH IMPLEMENTASI

1. Buat struktur services baru:

services/
commands/
queries/
event-handlers/
repositories/

2. Pisahkan logic write (mutasi data) ke command handlers.

Contoh:

tap attendance
create session
close session
manual absence

3. Pisahkan logic read ke query handlers.

Contoh:

attendance recap
session list
attendance detail

4. Pindahkan semua akses prisma ke repository layer.

5. Event emission tetap dilakukan pada command handlers.

6. Event consumer tetap berada pada event-handler files.

7. Controller harus memanggil command/query handler melalui service layer.

8. Pastikan tidak ada file baru yang lebih dari 1000 lines.

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Attendance Domain Refactor – Phase 4

yang menjelaskan perubahan implementasi.
