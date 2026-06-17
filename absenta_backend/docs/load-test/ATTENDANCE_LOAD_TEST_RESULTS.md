# ATTENDANCE LOAD TEST RESULTS

Tanggal:
- Start:
- End:

Environment
- Laptop (k6) IP: 10.60.0.2
- Backend Server IP: 10.60.0.1
- Base URL: http://10.60.0.1:3001
- Commit/branch:

Dataset
- File: docs/load-test/datasets/attendance_dataset.json
- Jumlah siswa di dataset:
- gateDevice:
- sessionId:

---

## Test 1 — Gerbang Load (k6-gerbang-load.js)

Konfigurasi
- Endpoint: POST /api/attendance/gerbang/tap
- Traffic: ramp 0→5 rps (30s), 5→20 rps (5m), 20→40 rps (5m)
- Jitter: sleep random(0.1, 0.8)

Hasil k6 (copy/paste)
```
<paste k6 output here>
```

Ringkasan
- Requests total:
- RPS max:
- Error rate:
- Latency p50:
- Latency p95:
- Latency p99:

Catatan error (jika ada)
- 401 (Unauthorized):
- 403 (Forbidden):
- 409 (Duplicate):
- 5xx:

---

## Test 2 — Sesi Spike (k6-sesi-spike.js)

Konfigurasi
- Endpoint: POST /api/attendance/sesi-absensi/:sessionId/tap-siswa
- Traffic: 30 siswa / 10 detik (shared-iterations, vus=30, iterations=30)
- Prasyarat: siswa sudah gate_present pada hari yang sama

Hasil k6 (copy/paste)
```
<paste k6 output here>
```

Ringkasan
- Requests total:
- Error rate:
- Latency p50:
- Latency p95:
- Latency p99:

Catatan error (jika ada)
- 400 (Gate belum tercatat / invalid prereq):
- 409 (Sudah terekam):
- 5xx:

---

## Test 3 — Stress 100 RPS (k6-stress.js)

Konfigurasi
- Endpoint: POST /api/attendance/gerbang/tap
- Traffic: 100 taps/sec selama 60 detik

Hasil k6 (copy/paste)
```
<paste k6 output here>
```

Ringkasan
- Max taps/sec tercapai:
- Error rate:
- Latency p50:
- Latency p95:
- Latency p99:

---

## Server Monitoring (selama test)

CPU
- htop screenshot/summary:

PostgreSQL
- `pg_stat_activity` snapshot:

Redis
- `redis-cli info stats` snapshot:

---

## Kesimpulan
- Batas sistem (taps/sec):
- Bottleneck utama (CPU/DB locks/IO/Redis/network):
- Rekomendasi tuning (query/index/pooling/queue):

