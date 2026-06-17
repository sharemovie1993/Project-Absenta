Instruksi Implementasi – Refactor Execution Phase 3 (Auth Tenant Onboarding)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Phase ini bertujuan menghilangkan orchestration lintas domain di module auth, khususnya pada tenant onboarding flow.

Auth tidak boleh lagi memanggil service dari domain lain secara langsung.

LANGKAH IMPLEMENTASI

1. Identifikasi semua pemanggilan service lintas domain pada tenant onboarding flow.

Contoh file yang kemungkinan terlibat:

src/modules/auth/tenant-onboarding.queue.ts
src/modules/auth/controllers/auth.controller.ts

2. Ganti orchestration langsung dengan domain event.

Saat tenant baru dibuat, auth hanya mengemit event:

tenant.created

3. Domain lain harus menangani initialization masing-masing melalui event consumer.

Contoh:

academic consumer
billing consumer
notification consumer

4. Setiap consumer hanya boleh melakukan:

validasi payload
enqueue job internal
jalankan command domain masing-masing

5. Auth tidak boleh memanggil service academic, billing, notification, atau domain lain secara langsung.

6. Pastikan perubahan tidak merusak flow berikut:

tenant registration
subscription initialization
welcome notification
tenant configuration setup

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Auth Domain Refactor – Phase 3

yang menjelaskan perubahan implementasi.
