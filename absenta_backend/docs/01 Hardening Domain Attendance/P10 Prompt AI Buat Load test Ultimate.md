TASK: ULTIMATE LOAD TEST — ABSENTA SAAS (2000 SCHOOL SIMULATION)

Context

Absenta adalah SaaS absensi sekolah dengan flow utama:

1. tap gerbang datang
2. tap sesi kelas
3. tap gerbang pulang

Target simulasi:

2000 sekolah
1000 siswa per sekolah

Total siswa:

2,000,000 siswa

Load test harus meniru pola nyata sekolah (burst traffic).

Gunakan tool:

k6

--------------------------------

PHASE 1 — SCHOOL WAVE SIMULATION (GERBANG DATANG)

Jam masuk sekolah biasanya tidak serentak.

Simulasikan gelombang sekolah:

06:30 → 200 sekolah
06:31 → 300 sekolah
06:32 → 400 sekolah
06:33 → 500 sekolah
06:34 → 400 sekolah
06:35 → 200 sekolah

Total sekolah:

2000 sekolah

Per sekolah:

1000 siswa tap dalam 10 menit.

Traffic estimasi peak:

≈ 3000–4000 request/sec

Endpoint:

POST /api/attendance/gerbang/tap

Durasi:

10 menit


--------------------------------

PHASE 2 — TAP SESI KELAS

Simulasikan absensi sesi pertama.

Jumlah sekolah:

2000

Jumlah siswa:

2 juta

Distribusi tap:

30 menit

Traffic:

≈ 1100 request/sec

Endpoint:

POST /api/attendance/sesi-absensi/:id/tap-siswa


--------------------------------

PHASE 3 — JAM PULANG

Simulasikan tap gerbang pulang.

Jumlah sekolah:

2000

Jumlah siswa:

2 juta

Distribusi:

20 menit

Traffic:

≈ 1700 request/sec

Endpoint:

POST /api/attendance/gerbang/tap


--------------------------------

PHASE 4 — MIXED TRAFFIC

Simulasikan kondisi sistem saat sekolah berjalan:

traffic campuran:

- tap gerbang
- tap sesi
- query laporan
- query dashboard

Durasi:

15 menit

Distribution:

40% tap gerbang
30% tap sesi
20% laporan
10% dashboard


--------------------------------

METRICS YANG HARUS DIREKAM

1. API metrics
   p50 latency
   p95 latency
   p99 latency

2. error rate

3. worker autoscaling
   jumlah worker attendance

4. Redis metrics
   ops/sec
   memory usage
   key eviction

5. PostgreSQL

   active connections
   slow queries
   index usage
   partition usage

6. queue metrics

   waiting jobs
   active jobs
   job latency


--------------------------------

SUCCESS CRITERIA

p95 latency < 500 ms
error rate < 1%
queue backlog stabil
worker autoscale berjalan

--------------------------------

OUTPUT YANG DIHARAPKAN

1. grafik request/sec
2. grafik latency
3. grafik worker scaling
4. grafik database load
5. rekomendasi bottleneck