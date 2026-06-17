Instruksi Implementasi – SUBSCRIPTION CANCEL FLOW (SaaS Best Practice)

Platform Absenta saat ini telah memiliki lifecycle subscription yang hampir lengkap:

* Registration → CORE subscription
* Upgrade subscription
* Downgrade subscription (scheduled)
* Renewal billing via scheduler

Langkah berikutnya adalah menambahkan **Cancel Subscription Flow** agar lifecycle SaaS menjadi lengkap.

Cancel subscription memungkinkan tenant menghentikan layanan tertentu tanpa menghapus tenant dari platform dan tanpa memengaruhi CORE platform subscription.

1. Prinsip Cancel Subscription

Cancel subscription pada SaaS tidak boleh langsung menonaktifkan layanan.

Best practice SaaS:

Cancel berlaku pada akhir periode billing saat ini.

Contoh:

Tenant memiliki:

ABSENSI_PRO_MONTHLY
billing period: 1 Mei – 31 Mei

Tenant request cancel pada 15 Mei.

Maka:

Subscription tetap aktif sampai 31 Mei.
Mulai 1 Juni subscription menjadi CANCELLED.

Dengan model ini:

* tidak perlu refund
* billing tetap konsisten
* invoice tetap valid

2. Endpoint Cancel Subscription

TRAE (ANDA) diminta menambahkan endpoint baru.

Route:

POST /api/subscriptions/:id/cancel

Body optional:

{
"reason": "optional text"
}

Endpoint ini harus:

* menjadwalkan cancel
* tidak langsung mengubah subscription status

3. Validasi Cancel

TRAE (ANDA) harus melakukan validasi berikut:

1. Subscription tidak boleh memiliki:

service_code = CORE

CORE subscription tidak boleh dibatalkan.

2. Subscription tidak boleh memiliki status:

PENDING_PAYMENT
UPGRADE_PENDING

3. Jika sudah ada PlanChangeRequest scheduled (upgrade/downgrade), cancel tidak boleh dilakukan.

Tujuannya untuk menghindari konflik lifecycle.

4. Mekanisme Cancel

Cancel subscription harus menggunakan model yang sama dengan downgrade.

Gunakan tabel yang sudah ada:

PlanChangeRequest

Tambahkan value baru pada enum change_type jika belum ada:

CANCEL

Field yang diisi:

subscription_id
from_plan_id
to_plan_id = null
change_type = CANCEL
status = SCHEDULED
effective_at = subscription.next_billing_date

Dengan demikian cancel akan berlaku pada renewal berikutnya.

5. Apply Cancel Pada Renewal

Scheduler renewal harus memeriksa PlanChangeRequest dengan kondisi:

status = SCHEDULED
change_type = CANCEL
effective_at <= billingDate

Jika ditemukan:

subscription.status harus diubah menjadi:

CANCELLED

Kemudian:

PlanChangeRequest.status = APPLIED

Setelah itu:

subscription tidak lagi ikut dalam recurring billing.

6. Update Recurring Billing Logic

TRAE (ANDA) harus memastikan recurring billing job:

tidak membuat billing baru untuk subscription dengan status:

CANCELLED

Namun subscription yang sudah cancel tetap disimpan untuk histori.

7. Cancel Cancel (Undo Cancel)

Tenant harus dapat membatalkan request cancel sebelum renewal.

Tambahkan endpoint:

POST /api/subscriptions/:id/cancel/undo

Implementasi:

* cari PlanChangeRequest dengan change_type=CANCEL
* status=SCHEDULED
* ubah status menjadi CANCELLED

8. Update Subscription Overview API

Subscription overview harus menampilkan informasi cancel yang dijadwalkan.

Tambahkan field:

scheduled_cancel

Contoh response:

subscription:
current_plan: ABSENSI_PRO
scheduled_cancel:
effective_at: 2026-06-01
status: SCHEDULED

9. Guard Behavior Setelah Cancel

Selama cancel belum effective:

subscription tetap dianggap ACTIVE.

Setelah scheduler apply cancel:

subscription.status = CANCELLED

subscription.guard harus menolak akses endpoint service tersebut.

10. Data Retention

Subscription yang sudah CANCELLED tidak boleh dihapus.

Data harus tetap disimpan untuk:

billing history
invoice history
audit log

11. Test Case

TRAE (ANDA) diminta menambahkan unit test berikut:

Test case 1 – schedule cancel

* tenant request cancel
* PlanChangeRequest dibuat
* subscription tetap ACTIVE

Test case 2 – scheduler apply cancel

* renewal scheduler berjalan
* subscription berubah menjadi CANCELLED
* billing tidak dibuat

Test case 3 – undo cancel

* tenant request cancel
* tenant undo cancel
* subscription tetap ACTIVE setelah renewal

12. Output Laporan

Setelah implementasi selesai, TRAE (ANDA) diminta membuat dokumen:

SUBSCRIPTION_CANCEL_IMPLEMENTATION_REPORT.md

Isi laporan:

1. endpoint cancel yang ditambahkan
2. perubahan enum PlanChangeRequest
3. perubahan scheduler renewal
4. perubahan subscription guard
5. hasil unit testing

Dengan implementasi ini, lifecycle subscription Absenta akan lengkap:

Upgrade
Downgrade
Renewal
Cancel

sesuai best practice SaaS platform.
