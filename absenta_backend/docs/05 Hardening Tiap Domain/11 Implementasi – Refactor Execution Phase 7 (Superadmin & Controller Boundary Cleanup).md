Instruksi Implementasi – Refactor Execution Phase 7 (Superadmin & Controller Boundary Cleanup)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Phase ini adalah tahap final domain hardening.

TUJUAN

1. Membersihkan domain superadmin agar mengikuti pola commands/queries/repositories.
2. Memastikan tidak ada controller yang mengakses prisma langsung.

LANGKAH IMPLEMENTASI

1. Audit module superadmin.

Identifikasi service besar seperti:

tenant-detail.service.ts

2. Pecah service tersebut menjadi struktur standar:

services/
commands/
queries/
repositories/
event-handlers/

3. Pindahkan semua akses prisma ke repository layer.

4. Scan seluruh controller dalam project.

Pastikan tidak ada penggunaan prisma langsung di controller.

5. Jika ditemukan query prisma pada controller:

* pindahkan ke repository
* panggil melalui service layer

6. Pastikan facade service tetap kompatibel dengan controller.

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Superadmin & Controller Boundary Cleanup – Phase 7
