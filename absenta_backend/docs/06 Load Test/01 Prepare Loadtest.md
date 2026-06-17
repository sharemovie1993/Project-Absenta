Instruksi Implementasi – Attendance Load Test Preparation

Tujuan tahap ini adalah mempersiapkan load test attendance yang realistis berdasarkan aturan aplikasi sebenarnya.

Sebelum membuat script load test (k6), lakukan audit flow autentikasi, role permission, dan payload request pada modul attendance.

---

STEP 1 — AUDIT AUTHENTICATION FLOW

Telusuri bagaimana client mendapatkan token untuk mengakses endpoint attendance.

Periksa:

src/modules/auth

Identifikasi:

1. endpoint login
2. tipe token yang digunakan (JWT / session)
3. header yang harus disertakan pada request attendance

Contoh yang diharapkan:

Authorization: Bearer <token>

Laporkan flow:

login → token → attendance request.

---

STEP 2 — AUDIT ROLE PERMISSION RULES

Periksa aturan role pada endpoint berikut.

Gerbang attendance:

POST /api/attendance/gerbang/tap

Aktor yang diperbolehkan:

GURU dengan jabatan tambahan GERBANG

Sesi attendance:

POST /api/attendance/sesi-absensi/:id/tap-siswa

Aktor yang diperbolehkan:

SISWA dengan jabatan PETUGAS_KELAS

Verifikasi:

1. middleware yang memvalidasi role
2. bagaimana role disimpan (DB / JWT / session)
3. field apa yang digunakan untuk menentukan role.

---

STEP 3 — AUDIT REQUEST PAYLOAD

Identifikasi payload yang dikirim pada endpoint:

POST /api/attendance/gerbang/tap
POST /api/attendance/sesi-absensi/:id/tap-siswa

Dokumentasikan contoh request body lengkap yang valid.

Termasuk:

siswaId
cardId
timestamp
deviceId
sessionId

---

STEP 4 — AUDIT TENANT CONTEXT

Karena sistem multi-tenant, identifikasi bagaimana tenant dipilih.

Periksa apakah menggunakan:

header tenant
subdomain
token claim

---

STEP 5 — GENERATE LOAD TEST DATASET

Setelah audit selesai, buat dataset simulasi:

1 sekolah:

* 1 guru GERBANG
* 10 siswa PETUGAS_KELAS
* 100 siswa biasa

Dataset harus berisi:

token login
siswaId
sessionId
kelasId
deviceId

---

STEP 6 — PREPARE K6 LOAD TEST SCENARIO

Buat skenario test menggunakan k6.

Test 1 — Gerbang Tap

Simulasi:

1000 siswa masuk sekolah dalam 15 menit.

Test 2 — Sesi Tap

Simulasi:

30 siswa melakukan tap dalam 10 detik.

Test 3 — Stress Test

Simulasi:

100 taps per second selama 60 detik.

---

OUTPUT

Buat dokumen:

docs/load-test/ATTENDANCE_LOAD_TEST_PLAN.md

Isi dokumen harus mencakup:

1. Flow autentikasi attendance
2. Role permission rules
3. Contoh request payload
4. Dataset simulasi siswa
5. Skenario load test
6. Rencana script k6

Jangan membuat script k6 terlebih dahulu sebelum audit flow selesai.

---

Status Implementasi

DONE
- Output dibuat: docs/load-test/ATTENDANCE_LOAD_TEST_PLAN.md
