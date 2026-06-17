TASK: REAL ATTENDANCE LOAD TEST (ABSENTA)

Context

Load test sebelumnya menggunakan endpoint stress:
    /stress/attendance/session

Sekarang jalankan load test menggunakan endpoint produksi Absenta
agar seluruh pipeline absensi benar-benar diuji.

Endpoint yang dipakai:

1) Gerbang datang
POST /api/attendance/gerbang/tap

2) Tap sesi kelas
POST /api/attendance/sesi-absensi/{sessionId}/tap-siswa

3) Gerbang pulang
POST /api/attendance/gerbang/tap


--------------------------------

STEP 1 — Seed Data Load Test

Buat data simulasi:

200 tenant sekolah

per tenant:

1000 siswa

buat juga:

5 sesi absensi aktif per sekolah


--------------------------------

STEP 2 — Load Test Script Baru

Buat script k6 baru:

scripts/k6/attendance_real.js

Skenario:

PHASE 1 — Gerbang datang

target:
3000 request/sec

duration:
5 menit

payload:

{
  "rfid": "simulated-rfid",
  "tenant_id": "...",
  "device_id": "gate-device-1"
}


--------------------------------

PHASE 2 — Tap sesi kelas

target:
1500 request/sec

duration:
5 menit

endpoint:

POST /api/attendance/sesi-absensi/{sessionId}/tap-siswa


--------------------------------

PHASE 3 — Gerbang pulang

target:
2000 request/sec

duration:
5 menit

endpoint sama dengan gerbang datang.


--------------------------------

STEP 3 — Metrics Yang Harus Direkam

1) API latency
p50
p95
p99

2) error rate

3) Redis

ops/sec
memory usage

4) PostgreSQL

insert/sec
active connections
slow query

5) worker autoscaling

jumlah worker attendance


--------------------------------

STEP 4 — Output

Simpan hasil ke:

logs/loadtest/attendance-real-*.json

Generate summary:

- request/sec
- latency graph
- worker scaling
- database load


--------------------------------

SUCCESS CRITERIA

p95 latency < 500ms
error rate < 1%
queue backlog stabil
worker autoscaling berjalan