Instruksi Implementasi – PLAN ARCHITECTURE REFACTOR (Multi-Service SaaS Ready)

Platform Absenta saat ini sudah memiliki fondasi billing dan subscription lifecycle yang stabil.
Namun hasil audit PLAN_MODEL_AUDIT menunjukkan bahwa model Plan masih bersifat hybrid dan belum sepenuhnya mendukung arsitektur SaaS multi-service modular.

Beberapa temuan penting dari audit:

* Plan belum memiliki identitas service yang eksplisit.
* Subscription lifecycle sudah mendukung multi-subscription tenant, tetapi service belum dibedakan secara formal.
* Feature tenant masih digabung secara akumulatif (merge features) ketika upgrade plan.
* Tidak ada arsitektur add-on service sebagai first-class entity.

Instruksi ini bertujuan melakukan refactor minimal yang aman untuk menjadikan arsitektur Plan dan Subscription siap untuk SaaS multi-service, tanpa merusak billing lifecycle yang sudah berjalan.

1. Tujuan Refactor

Refactor ini memiliki empat tujuan utama:

1. Menambahkan identitas service pada Plan.
2. Membuat Subscription memiliki identitas service yang eksplisit.
3. Menghentikan mekanisme merge fitur yang berpotensi menyebabkan privilege leak.
4. Menyiapkan fondasi untuk add-on service di masa depan.

Refactor ini tidak mengubah flow billing yang sudah ada dan tidak mengubah invoice atau payment gateway.

2. Penambahan Field Identitas Plan

TRAE (ANDA) diminta menambahkan dua field baru pada model Plan.

Field pertama:

code

Fungsi:
identifier canonical untuk plan.

Contoh nilai:

CORE_PLATFORM
ABSENSI_SIMPLE_SMALL
ABSENSI_SIMPLE_MEDIUM
KOPERASI_SMALL

Constraint:

unique index pada code.

Field kedua:

service_code

Fungsi:
menandakan plan ini milik service apa.

Contoh nilai:

CORE
ABSENSI
KOPERASI

Plan yang ada saat ini harus dipetakan ulang menggunakan field ini.

3. Update Schema Plan

TRAE (ANDA) diminta memperbarui schema Plan.

Tambahkan field berikut:

code String @unique
service_code String

Contoh struktur setelah refactor (simplified):

Plan

* id
* code
* service_code
* name
* price_monthly
* price_yearly
* billing_period
* currency
* trial_days
* max_user
* features_json
* is_public
* is_active
* metadata

4. Migrasi Data Plan Yang Sudah Ada

TRAE (ANDA) diminta melakukan mapping plan yang ada saat ini.

Mapping yang diharapkan:

CORE_PLATFORM
service_code = CORE

Absensi-Simple Micro/Small/Medium/Large
service_code = ABSENSI

Absensi-Multi Small/Medium/Large/Enterprise
service_code = ABSENSI

Koperasi Small/Medium/Large
service_code = KOPERASI

code harus dibuat konsisten.

Contoh:

ABSENSI_SIMPLE_SMALL_MONTHLY
ABSENSI_SIMPLE_SMALL_YEARLY

Jika plan tidak memiliki identifier yang jelas, TRAE (ANDA) diminta membuat code yang stabil berdasarkan nama plan.

5. Penambahan Identitas Service pada Subscription

TRAE (ANDA) diminta menambahkan field baru pada tabel Subscription:

service_code String

Nilai ini diisi berdasarkan plan.service_code pada saat subscription dibuat atau diperbarui.

Dengan perubahan ini struktur menjadi:

Tenant
↓
Subscription
↓
Plan
↓
Service

6. Update Logic Create Subscription

TRAE (ANDA) diminta memperbarui logic pembuatan subscription.

Ketika subscription dibuat:

subscription.service_code = plan.service_code

Hal ini berlaku untuk:

* registrasi tenant
* upgrade plan
* order subscription

7. Perbaikan extendSubscription Logic

Audit menemukan bahwa extendSubscription saat ini melakukan merge features.

Contoh:

mergedFeatures = oldFeatures + newPlanFeatures

TRAE (ANDA) diminta mengubah logic ini.

Fitur tenant setelah upgrade harus berasal langsung dari plan target.

Logic baru:

subscription.plan_snapshot.features_json = plan.features_json

Tidak boleh ada merge dari plan lama.

8. Penyesuaian Subscription Guard

Middleware subscription guard saat ini mencari subscription berdasarkan heuristik plan CORE.

TRAE (ANDA) diminta memperbarui logika ini.

Rule baru:

Core subscription:

service_code = CORE

Service subscription:

service_code ≠ CORE

Middleware harus memastikan tenant memiliki:

* core subscription aktif
* service subscription aktif untuk modul tertentu

9. Persiapan Arsitektur Add-On

Refactor ini belum mengimplementasikan add-on, tetapi TRAE (ANDA) diminta menyiapkan tabel dasar.

Tambahkan model berikut:

Addon

* id
* code
* name
* price_monthly
* price_yearly
* service_code
* metadata

PlanAddon

* plan_id
* addon_id

SubscriptionAddon

* subscription_id
* addon_id
* quantity

Add-on tidak perlu diintegrasikan ke billing flow saat ini.
Model ini hanya disiapkan untuk implementasi tahap berikutnya.

10. Backward Compatibility

TRAE (ANDA) harus memastikan refactor ini tidak merusak komponen berikut:

* billing lifecycle
* invoice generation
* payment webhook
* scheduler renewal
* plan change request

Semua fitur tersebut harus tetap berjalan seperti sebelumnya.

11. Validasi Setelah Refactor

TRAE (ANDA) diminta melakukan validasi berikut:

1. Registrasi tenant tetap membuat CORE subscription.

2. Upgrade plan tetap menghasilkan billing dan invoice.

3. Payment webhook tetap mengaktifkan subscription.

4. Subscription sekarang memiliki service_code yang benar.

5. Output Laporan

Setelah refactor selesai, TRAE (ANDA) diminta membuat dokumen:

PLAN_ARCHITECTURE_REFACTOR_REPORT.md

Isi laporan:

1. perubahan schema database
2. migrasi plan code dan service_code
3. perubahan logic subscription
4. perubahan extendSubscription
5. update middleware subscription guard
6. model add-on yang ditambahkan
7. validasi bahwa billing lifecycle tetap berjalan

Refactor ini adalah langkah penting untuk menjadikan platform Absenta siap sebagai SaaS multi-service modular.
