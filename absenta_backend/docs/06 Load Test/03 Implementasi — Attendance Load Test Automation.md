Instruksi Implementasi — Attendance Load Test Automation

Tujuan implementasi ini adalah membuat script otomatis untuk mempersiapkan dan menjalankan load test attendance.

Operator tidak perlu mengedit dataset manual.

Operator hanya perlu menjalankan satu script dan memasukkan beberapa parameter.

---

STRUKTUR FOLDER

docs/load-test/

docs/load-test/scripts/
docs/load-test/datasets/
docs/load-test/tools/

---

STEP 1 — Script Prepare Dataset

Buat file:

docs/load-test/tools/prepare-dataset.js

Fungsi script ini:

1. Login ke sistem menggunakan email/password yang diberikan operator.
2. Mengambil JWT token untuk:

   * guru gerbang
   * petugas kelas
3. Mengambil daftar siswa dari database melalui endpoint API jika tersedia.
4. Membuat dataset JSON otomatis.

Script harus meminta input dari operator:

* baseUrl
* email guru gerbang
* password
* jumlah siswa yang ingin digunakan untuk test
* device_id

Output file:

docs/load-test/datasets/attendance_dataset.json

---

STEP 2 — Script Create Attendance Session

Buat file:

docs/load-test/tools/create-session.js

Fungsi:

1. Login sebagai guru atau admin.
2. Memanggil endpoint:

POST /api/attendance/sesi-absensi

3. Mengambil sessionId dari response.
4. Menambahkan sessionId ke dataset JSON.

Output:

update attendance_dataset.json

---

STEP 3 — Script Gate Warmup

Buat file:

docs/load-test/tools/warmup-gate.js

Fungsi:

melakukan tap gerbang datang untuk semua siswa di dataset.

Endpoint:

POST /api/attendance/gerbang/tap

Tujuan:

memastikan siswa sudah tercatat gate_present sebelum test sesi dilakukan.

---

STEP 4 — Interactive Test Runner

Buat file:

docs/load-test/run-load-test.js

Script harus menampilkan menu:

Select load test scenario:

1. Gate Arrival Test
2. Session Attendance Spike
3. Stress Test
4. Full Simulation (Gate + Session)

Script meminta input tambahan:

jumlah siswa
duration
target rps

Script akan menjalankan k6 dengan parameter yang sesuai.

---

STEP 5 — Wrapper Script untuk k6

Script harus menjalankan k6 secara otomatis.

Contoh:

k6 run docs/load-test/scripts/k6-gerbang-load.js

atau

k6 run docs/load-test/scripts/k6-sesi-spike.js

---

STEP 6 — Skenario Test

Script runner harus mendukung skenario berikut.

Scenario 1 — Gate Arrival

Simulasi siswa masuk sekolah.

Parameter:

jumlah siswa
durasi menit

Scenario 2 — Session Attendance

Simulasi absensi kelas.

Parameter:

jumlah siswa dalam kelas
durasi detik

Scenario 3 — Stress Test

Simulasi taps/sec tinggi.

Parameter:

target rps
durasi detik

Scenario 4 — Full Simulation

Urutan otomatis:

1. prepare dataset
2. gate warmup
3. session spike
4. optional stress test

---

STEP 7 — Output

Script harus menghasilkan file:

docs/load-test/ATTENDANCE_LOAD_TEST_RESULTS.md

dan menampilkan summary k6 di terminal.

---

STEP 8 — Operator Flow

Operator hanya perlu menjalankan:

node docs/load-test/run-load-test.js

Script akan:

1. meminta input
2. menyiapkan dataset
3. membuat sesi
4. menjalankan load test

---

OUTPUT

Tambahkan dokumentasi:

docs/load-test/ATTENDANCE_TEST_AUTOMATION.md

yang menjelaskan cara menjalankan automation script.

---

Status Implementasi

DONE
- Tools:
  - docs/load-test/tools/prepare-dataset.js
  - docs/load-test/tools/create-session.js
  - docs/load-test/tools/warmup-gate.js
- Runner:
  - docs/load-test/run-load-test.js
- Dokumentasi:
  - docs/load-test/ATTENDANCE_TEST_AUTOMATION.md
