Instruksi Implementasi – Refactor Execution Phase 2 (Parent App Domain)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Phase ini bertujuan memutus dependency antara parent-app dan attendance domain.

Target utama adalah menghilangkan service call langsung dari parent-app ke attendance.

LANGKAH IMPLEMENTASI

1. Identifikasi semua pemanggilan service attendance dalam module parent-app.

Contoh file yang kemungkinan terlibat:

src/modules/parent-app/services/parent-data.service.ts
src/modules/parent-app/controllers/parent-auth.controller.ts

2. Ganti pola service call lintas domain dengan event-driven flow.

Contoh perubahan:

sebelumnya:

parent-app → attendanceService.getStudentAttendance()

sesudah:

attendance domain emit event:

attendance.tap
attendance.session.tap
attendance.manual.submit

3. Tambahkan event consumer di parent-app untuk event attendance yang relevan.

Consumer hanya melakukan:

validasi payload
query internal repository
update parent projection / cache / view model

4. Parent-app tidak boleh melakukan query langsung ke attendance database.

Jika membutuhkan data tambahan gunakan:

payload snapshot dari event
atau repository internal yang tenant-scoped.

5. Pastikan perubahan tidak merusak:

parent mobile API
parent dashboard
existing notification flow

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Parent App Refactor – Phase 2

yang menjelaskan perubahan implementasi.
