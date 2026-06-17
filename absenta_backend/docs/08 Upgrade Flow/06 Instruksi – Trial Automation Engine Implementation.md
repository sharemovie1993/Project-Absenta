Instruksi – Trial Automation Engine Implementation

Tujuan implementasi ini adalah membuat sistem otomatis untuk mengelola trial layanan pada platform Absenta.

Engine harus dapat:

memulai trial
mengirim pengingat trial
mengakhiri trial
mengubah status layanan setelah trial berakhir

Tidak boleh mengubah API contract.

---

STEP 1 – Verifikasi Field Trial di Subscription

Pastikan tabel subscription memiliki:

start_date
end_date

Jika plan memiliki trial_days maka:

end_date = start_date + trial_days

Subscription trial harus memiliki:

status = TRIAL

---

STEP 2 – Start Trial Flow

Ketika tenant memilih trial layanan:

buat subscription baru:

status = TRIAL
start_date = now
end_date = now + trial_days

Plan diambil dari tabel Plan.

Contoh:

Plan ABSENSI_TRIAL

trial_days = 7

---

STEP 3 – Buat Trial Expiration Worker

Buat worker baru:

workers/trial-expiration.worker.ts

Worker berjalan setiap 1 jam.

Logic:

Cari subscription dengan:

status = TRIAL
end_date < now

Jika ditemukan:

update subscription.status = EXPIRED

Publish event:

trial.expired

---

STEP 4 – Trial Reminder Job

Buat job baru:

jobs/trial-reminder.job.ts

Job berjalan setiap hari.

Cari subscription dengan kondisi:

status = TRIAL
end_date - now <= 3 hari

Kirim notifikasi:

email
whatsapp
in-app notification

Pesan:

"Trial layanan Absensi akan berakhir dalam 3 hari."

---

STEP 5 – Integrasi dengan Notification System

Gunakan modul notification.

Tambahkan event:

trial.expiring
trial.expired

Worker harus mem-publish event tersebut.

---

STEP 6 – Dashboard Trial Banner

Jika tenant memiliki trial aktif:

dashboard harus menampilkan banner:

"Trial Absensi tersisa 5 hari."

Tambahkan tombol:

Upgrade Sekarang

yang menuju halaman:

/services

---

STEP 7 – Sidebar Trial Indicator

Jika feature_state = TRIAL

Sidebar harus menampilkan badge:

TRIAL

Contoh:

Absensi [TRIAL]

---

STEP 8 – Upgrade Conversion Tracking

Tambahkan log event:

trial.started
trial.expiring
trial.expired
trial.converted

Event ini dapat digunakan untuk analitik SaaS.

---

STEP 9 – Verification

Simulasikan kondisi berikut:

tenant memulai trial
trial berjalan
trial hampir habis
trial expired

Pastikan:

FeatureStateResolver berubah dari TRIAL → EXPIRED

Mutation endpoint harus diblok setelah trial berakhir.

---

STEP 10 – Output Implementation Report

Buat laporan:

TRIAL_AUTOMATION_ENGINE_IMPLEMENTATION.md

Isi laporan:

trial start flow
trial reminder job
trial expiration worker
notification integration
verification results
