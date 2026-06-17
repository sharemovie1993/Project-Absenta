# ATTENDANCE TEST AUTOMATION

Dokumen ini menjelaskan cara menjalankan automation script untuk menyiapkan dataset, membuat sesi, warmup gerbang, dan menjalankan load test k6 tanpa edit manual dataset.

Environment
- Base URL (WireGuard): `http://10.60.0.1:3001`
- Jalankan dari laptop operator yang memiliki `node` dan `k6` terpasang.

Struktur
- Tools:
  - [prepare-dataset.js](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/load-test/tools/prepare-dataset.js)
  - [create-session.js](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/load-test/tools/create-session.js)
  - [warmup-gate.js](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/load-test/tools/warmup-gate.js)
- Runner:
  - [run-load-test.js](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/load-test/run-load-test.js)
- Output:
  - dataset: [attendance_dataset.json](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/load-test/datasets/attendance_dataset.json)
  - hasil: [ATTENDANCE_LOAD_TEST_RESULTS.md](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/load-test/ATTENDANCE_LOAD_TEST_RESULTS.md)

---

## Cara menjalankan (mode otomatis)

Jalankan:
```bash
node docs/load-test/run-load-test.js
```

Script akan meminta input:
- `baseUrl` (default `http://10.60.0.1:3001`)
- `tenantDomain` (opsional, dipakai saat login untuk resolve tenant; berguna jika akses via IP)
- `email/password` guru gerbang
- `jumlah siswa` yang akan dipakai (diambil dari API)
- opsi email petugas kelas (comma-separated)
- pilihan skenario:
  - Gate Arrival
  - Session Spike
  - Stress Test
  - Full Simulation

Parameter akan diteruskan ke k6 lewat environment variables (mis. rate/duration) sesuai skenario.

---

## Tool manual (opsional)

1) Generate dataset
```bash
node docs/load-test/tools/prepare-dataset.js
```

2) Create sesi absensi dan update dataset
```bash
node docs/load-test/tools/create-session.js
```

3) Warmup gate untuk semua siswa di dataset
```bash
node docs/load-test/tools/warmup-gate.js
```

---

## Catatan operasional

- `tenantDomain` hanya dipakai sebagai header `X-Tenant-Domain` saat login (tenant resolve). Setelah token didapat, request attendance memakai tenant context dari JWT.
- Script k6 membaca dataset dari `docs/load-test/datasets/attendance_dataset.json`.
- Untuk menjalankan k6:
  - pastikan `k6` tersedia di PATH pada laptop operator.

