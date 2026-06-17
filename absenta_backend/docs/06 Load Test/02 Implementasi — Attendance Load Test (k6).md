Instruksi Implementasi — Attendance Load Test (k6)

Environment

Load test akan dijalankan dari laptop melalui WireGuard langsung ke backend server.

Network topology:

Laptop (k6) → 10.60.0.2
Backend Server → 10.60.0.1

Base URL untuk load test:

http://10.60.0.1:3001

Jangan menggunakan domain nginx reverse proxy.

---

STEP 1 — Buat Folder Load Test

Buat struktur berikut:

docs/load-test/

docs/load-test/scripts/
docs/load-test/datasets/

---

STEP 2 — Generate Dataset JSON

Buat file:

docs/load-test/datasets/attendance_dataset.json

Dataset harus berisi:

* token guru gerbang
* token petugas kelas
* daftar siswa
* sessionId
* deviceId

Contoh struktur:

{
"baseUrl": "http://10.60.0.1:3001",
"gateDevice": "GATE-01",
"guruGerbangToken": "<token>",
"sessionId": "<sesi-id>",
"students": [
{ "id": "SISWA_001", "rfid": "RFID001" },
{ "id": "SISWA_002", "rfid": "RFID002" }
]
}

---

STEP 3 — Script k6 Gerbang Load

File:

docs/load-test/scripts/k6-gerbang-load.js

Tujuan:
Simulasi siswa masuk sekolah.

Endpoint:

POST /api/attendance/gerbang/tap

Request body:

{
"siswa_id": "<id>",
"arah": "GERBANG_DATANG",
"device_id": "GATE-01",
"rfid": "<rfid>"
}

Traffic pattern:

ramp:

0 → 5 rps (30s)
5 → 20 rps (5m)
20 → 40 rps (5m)

---

STEP 4 — Script k6 Sesi Tap

File:

docs/load-test/scripts/k6-sesi-spike.js

Tujuan:
Simulasi absensi kelas.

Endpoint:

POST /api/attendance/sesi-absensi/:sessionId/tap-siswa

Request body:

{
"siswa_id": "<id>"
}

Traffic model:

Spike:

30 siswa dalam 10 detik.

---

STEP 5 — Script Stress Test

File:

docs/load-test/scripts/k6-stress.js

Tujuan:

Menemukan batas sistem.

Endpoint:

/attendance/gerbang/tap

Traffic:

100 taps/sec selama 60 detik.

---

STEP 6 — Tambahkan Random Delay

Tambahkan jitter:

sleep(random(0.1, 0.8))

untuk meniru delay tap manusia.

---

STEP 7 — Metrics Yang Harus Dicatat

Dalam k6 output:

* latency p50
* latency p95
* latency p99
* error rate
* requests per second

---

STEP 8 — Monitoring Plan

Saat load test berjalan, monitor server backend.

Jalankan di VPS:

CPU:

htop

PostgreSQL activity:

sudo -u postgres psql

SELECT * FROM pg_stat_activity;

Redis stats:

redis-cli info stats

---

STEP 9 — Jalankan Load Test

Dari laptop:

cd docs/load-test/scripts

Test gerbang:

k6 run k6-gerbang-load.js

Test sesi:

k6 run k6-sesi-spike.js

Stress test:

k6 run k6-stress.js

---

OUTPUT

Buat laporan:

docs/load-test/ATTENDANCE_LOAD_TEST_RESULTS.md

Laporan harus berisi:

* max taps/sec
* average latency
* p95 latency
* error rate
* CPU usage server
* PostgreSQL load

---

Status Implementasi

DONE
- Folder dibuat: docs/load-test/scripts, docs/load-test/datasets
- Dataset template: docs/load-test/datasets/attendance_dataset.json
- Script k6: docs/load-test/scripts/k6-gerbang-load.js, k6-sesi-spike.js, k6-stress.js
- Template hasil: docs/load-test/ATTENDANCE_LOAD_TEST_RESULTS.md
