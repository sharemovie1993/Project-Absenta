TASK: LOAD TEST SIMULATION — DOMAIN ABSENSI

Context

Absenta adalah SaaS absensi sekolah.

Flow bisnis utama:

1. siswa tap gerbang (datang)
2. siswa tap sesi kelas
3. siswa tap gerbang (pulang)

Load test harus mensimulasikan kondisi nyata sekolah:

- ribuan sekolah
- burst traffic pada jam masuk sekolah
- request concurrency tinggi

Target test:

- validasi autoscaling worker
- validasi queue processing
- validasi database partition performance
- validasi Redis stability

--------------------------------

TEST SCENARIO 1 — JAM GERBANG PAGI

Simulasi:

500 sekolah
1000 siswa per sekolah

Total siswa:

500k siswa

Waktu simulasi:

06:30 – 06:45

Event:

setiap siswa melakukan 1 tap gerbang datang

Total event:

500k tap

Durasi:

15 menit

Traffic rate:

≈ 555 request/sec


Endpoint yang diuji:

POST /api/attendance/gerbang/tap


--------------------------------

TEST SCENARIO 2 — BURST GERBANG (PEAK)

Simulasi peak realistic.

Sekolah sering melakukan tap hampir bersamaan.

Simulasi:

200 sekolah
1000 siswa

Total:

200k tap

Durasi:

5 menit

Traffic rate:

≈ 666 request/sec

Target:

lihat apakah autoscaler worker attendance bertambah.


--------------------------------

TEST SCENARIO 3 — TAP SESI KELAS

Setelah jam gerbang.

Simulasi:

500 sekolah
1000 siswa

Setiap siswa melakukan:

1 tap sesi

Endpoint:

POST /api/attendance/sesi-absensi/:id/tap-siswa

Durasi:

30 menit

Traffic:

≈ 277 request/sec


--------------------------------

TEST SCENARIO 4 — JAM PULANG SEKOLAH

Simulasi:

500 sekolah
1000 siswa

Event:

tap gerbang pulang

Durasi:

20 menit

Traffic:

≈ 416 request/sec


--------------------------------

TOOLS

Gunakan tool load test:

k6

atau

artillery


--------------------------------

METRICS YANG HARUS DIKUMPULKAN

1. API latency
   p50
   p95
   p99

2. error rate

3. worker autoscaling
   jumlah container worker

4. Redis metrics
   memory
   ops/sec

5. PostgreSQL
   connections
   slow query
   index usage

6. queue pressure
   waiting jobs
   active jobs


--------------------------------

SUCCESS CRITERIA

p95 latency < 500 ms

error rate < 0.5%

queue backlog stabil

worker autoscale berjalan


--------------------------------

OUTPUT YANG DIHARAPKAN

1. grafik request/sec
2. grafik latency
3. grafik worker scaling
4. grafik database load
5. rekomendasi bottleneck