Instruksi Implementasi – SUBSCRIPTION DOWNGRADE FLOW (SaaS Best Practice)

Platform Absenta saat ini sudah memiliki arsitektur multi-service SaaS yang stabil, termasuk billing lifecycle, invoice generation, payment webhook, dan scheduler renewal. Upgrade flow untuk subscription sudah tersedia dan berjalan melalui mekanisme `PlanChangeRequest → Billing → Invoice → Payment → extendSubscription`.

Namun sistem saat ini belum memiliki flow downgrade subscription yang formal.

Instruksi ini bertujuan menambahkan downgrade flow yang mengikuti best practice SaaS tanpa merusak billing lifecycle yang sudah berjalan.

1. Prinsip Downgrade SaaS

Downgrade tidak boleh langsung mengubah plan saat ini.

Best practice SaaS:

Downgrade selalu berlaku pada akhir periode billing saat ini.

Contoh:

Tenant memiliki plan:

ABSENSI_ENTERPRISE_MONTHLY
billing period: 1 Mei – 31 Mei

Tenant melakukan downgrade ke:

ABSENSI_SMALL_MONTHLY

Maka:

Plan saat ini tetap aktif sampai 31 Mei.
Plan baru berlaku mulai 1 Juni.

Dengan demikian:

* tidak ada refund kompleks
* billing tetap konsisten
* invoice tetap valid

2. Endpoint Downgrade

TRAE (ANDA) diminta menambahkan endpoint baru.

Route:

POST /api/subscriptions/:id/downgrade

Endpoint ini harus:

* menerima `target_plan_id`
* memvalidasi bahwa plan target adalah downgrade (bukan upgrade)
* membuat `PlanChangeRequest` dengan tipe downgrade

3. Validasi Downgrade

TRAE (ANDA) harus melakukan validasi berikut.

Plan target harus memiliki:

* `service_code` yang sama dengan subscription saat ini

Contoh:

ABSENSI → hanya boleh downgrade ke plan ABSENSI

Tidak boleh:

ABSENSI → KOPERASI

Plan target harus memiliki harga lebih rendah dari plan saat ini.

Contoh valid:

Enterprise → Medium
Medium → Small

Contoh tidak valid:

Small → Enterprise (itu upgrade)

4. Pembuatan PlanChangeRequest

TRAE (ANDA) diminta menggunakan tabel yang sudah ada:

PlanChangeRequest

Field yang harus diisi:

subscription_id
from_plan_id
to_plan_id
change_type = DOWNGRADE
status = SCHEDULED

Tambahkan field baru jika belum ada:

effective_at

Nilai:

subscription.next_billing_date

5. Tidak Ada Billing Baru Saat Downgrade

Downgrade tidak membuat billing baru.

Karena plan lama tetap aktif sampai akhir periode.

Billing berikutnya akan menggunakan plan baru secara otomatis.

TRAE (ANDA) harus memastikan:

Tidak ada:

Billing
Invoice
Payment

yang dibuat saat request downgrade.

6. Update Scheduler Renewal

Pada saat scheduler renewal membuat billing baru untuk subscription yang akan diperpanjang, sistem harus memeriksa apakah ada `PlanChangeRequest` dengan kondisi:

status = SCHEDULED
change_type = DOWNGRADE
effective_at <= now

Jika ada:

subscription.plan_id harus diganti ke `to_plan_id` sebelum billing dibuat.

7. Update PlanChangeRequest Status

Setelah downgrade diterapkan pada renewal:

status harus berubah menjadi:

APPLIED

8. Cancel Downgrade

TRAE (ANDA) juga harus menambahkan endpoint:

POST /api/subscriptions/:id/downgrade/cancel

Fungsi endpoint:

membatalkan downgrade yang sudah dijadwalkan.

Implementasi:

* cari PlanChangeRequest dengan status SCHEDULED
* ubah status menjadi CANCELLED

9. Batasan Downgrade

Beberapa batasan harus diterapkan.

Tidak boleh downgrade:

CORE subscription.

CORE subscription harus selalu aktif.

Jika subscription sedang:

UPGRADE_PENDING
PAYMENT_PENDING

downgrade tidak boleh dilakukan.

10. Update Subscription Overview API

Endpoint subscription overview harus menampilkan informasi downgrade yang dijadwalkan.

Tambahkan field:

scheduled_downgrade

Contoh response:

subscription:
current_plan: ABSENSI_ENTERPRISE
next_plan: ABSENSI_SMALL
downgrade_effective_at: 2026-06-01

11. Update Guard Logic

Tidak perlu perubahan besar pada subscription guard.

Karena downgrade hanya berlaku setelah renewal.

Namun TRAE (ANDA) harus memastikan:

Jika downgrade sudah applied, service_code tetap konsisten dengan plan baru.

12. Pengujian

TRAE (ANDA) diminta melakukan pengujian berikut:

Test case 1 – downgrade scheduled

* tenant memiliki ABSENSI_ENTERPRISE
* request downgrade ke ABSENSI_SMALL
* PlanChangeRequest dibuat
* plan tidak berubah sebelum renewal

Test case 2 – scheduler apply downgrade

* scheduler renewal berjalan
* plan berubah ke target plan
* billing dibuat menggunakan plan baru

Test case 3 – cancel downgrade

* tenant request downgrade
* tenant cancel downgrade
* renewal tetap menggunakan plan lama

13. Output Laporan

TRAE (ANDA) diminta membuat dokumen:

SUBSCRIPTION_DOWNGRADE_IMPLEMENTATION_REPORT.md

Isi laporan:

1. endpoint downgrade yang ditambahkan
2. perubahan pada PlanChangeRequest
3. perubahan pada renewal scheduler
4. validasi downgrade logic
5. hasil pengujian downgrade flow

Implementasi ini akan melengkapi subscription lifecycle Absenta sehingga mendukung:

upgrade
downgrade
renewal

sesuai best practice SaaS platform.
