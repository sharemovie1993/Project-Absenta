# ATTENDANCE LOAD TEST PLAN (Prep) — Auth, Permission, Payload Audit

Tanggal: 2026-03-15

Dokumen ini menyelesaikan “Attendance Load Test Preparation” sebelum pembuatan script k6.

Lingkup audit
- Auth: `src/modules/auth/*`, middleware: `src/middlewares/auth.ts`, `src/middlewares/tenant.ts`
- Attendance:
  - Gerbang: `src/modules/attendance/gerbang/*`
  - Sesi absensi: `src/modules/attendance/sesi-absensi/*`

---

## 1) Flow Autentikasi Attendance

### 1.1 Endpoint login
- `POST /api/auth/login`
  - Registrasi route: [auth.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/routes/auth.routes.ts#L54-L66)
  - Router group `/api`: [router.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L165-L188)

### 1.2 Token type + masa berlaku
- Token: JWT dari `fastify-jwt`
  - Payload token (access) saat login: [auth.controller.ts:L1251-L1274](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts#L1251-L1274)
- Access token `exp`: 15 menit
- Refresh token `exp`: 7 hari

Field penting di token (dipakai attendance/tenant middleware)
- `tenantId`
- `roleName`
- `id` (user id)

### 1.3 Header yang harus disertakan untuk request attendance
Semua endpoint attendance (di bawah `/api/attendance/*`) membutuhkan:
- `Authorization: Bearer <token>`
  - Enforcement header & JWT verify: [authMiddleware](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts#L62-L121)
- `Content-Type: application/json`

Catatan tenant header
- Non-SUPERADMIN: tenant context **wajib** ada di token (claim `tenantId`) dan `tenantMiddleware` akan set `request.tenantId = jwtTenantId`:
  - [tenantMiddleware](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts#L86-L145)
- `X-Tenant-ID` (opsional) jika dipakai harus match tenantId di token (kalau mismatch → 403):
  - [tenantMiddleware mismatch check](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts#L121-L145)

### 1.4 Flow refresh token (opsional untuk test >15 menit)
- `POST /api/auth/refresh`
  - body: `{ "refreshToken": "<refresh>" }`
  - Implementasi: [auth.controller.ts:L1395-L1429](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts#L1395-L1429)

### 1.5 Ringkasan flow (login → token → attendance request)
1. Login user gate officer / petugas kelas:
   - `POST /api/auth/login`
2. Ambil `data.token` (JWT)
3. Panggil endpoint attendance dengan:
   - `Authorization: Bearer <token>`
4. Jika test berjalan lama:
   - refresh token setiap ±12 menit atau login ulang per batch

---

## 2) Audit Role Permission Rules (Gerbang & Sesi)

Rule aktual pada kode terbagi menjadi 2 layer:
1) Route preHandler `requireCapability(...)` (permission layer)
2) Inline checks pada controller/guard (struktur “petugas” berbasis DB)

### 2.1 Gerbang Tap — POST /api/attendance/gerbang/tap

Route & capability
- Route: [gerbang.routes.ts:L26-L44](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/routes/gerbang.routes.ts#L26-L44)
- Required capability: `attendance.gate.tap.entry`
- Middleware: [requireCapability](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts#L119-L138)

Rule tambahan di controller (petugas check)
- Controller: [gerbang.controller.ts:L92-L132](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L92-L132)

Peran yang diizinkan (berdasarkan code tracing)
- `SUPERADMIN` / `ADMIN`: langsung allowed
- `GURU`: harus punya record `guru` dan assignment aktif di `guruStrukturOrganisasi` dengan `StrukturOrganisasi.scope = 'attendance'`
- `SISWA`: harus punya assignment aktif di `siswaStrukturOrganisasi` dengan `StrukturOrganisasi.scope = 'attendance'`

Implikasi untuk load test “realistis”
- Gate officer (GURU GERBANG) direpresentasikan oleh:
  - `User.roleName = GURU`
  - memiliki `guru` profile
  - ada `guruStrukturOrganisasi` aktif dengan scope attendance

### 2.2 Sesi Tap — POST /api/attendance/sesi-absensi/:id/tap-siswa

Prasyarat mode
- Endpoint sesi berada dalam MULTI_SESI mode:
  - `requireMultiSesiMode`: [sesi-absensi.routes.ts:L75-L84](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts#L75-L84)

Route & capability
- Required capability: `attendance.sessions.update.attendance`
  - Route: [sesi-absensi.routes.ts:L75-L84](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts#L75-L84)

Guard rule (petugas kelas)
- Guard: [SesiGuard.validateSessionAccess](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts#L34-L135)
- Jika `SISWA`:
  - harus punya `siswaStrukturOrganisasi` aktif untuk kelas sesi (`kelas_id` sesi) dengan scope attendance
- Jika `GURU`:
  - guru “petugas attendance” bisa akses penuh, tetapi guru biasa dilarang scan siswa (`tap-siswa`)
  - rule dilarang scan untuk guru biasa: [sesi.guard.ts:L88-L96](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts#L88-L96)
- Jika `ADMIN/SUPERADMIN`: allowed

Implikasi untuk load test “realistis”
- Petugas kelas direpresentasikan oleh:
  - `User.roleName = SISWA`
  - punya `siswa` profile
  - assignment aktif `siswaStrukturOrganisasi` untuk `kelas_id` yang sama dengan sesi

---

## 3) Audit Request Payload (Contoh Request Valid)

### 3.1 Gerbang Tap — POST /api/attendance/gerbang/tap

Schema route (minimal)
- required: `siswa_id`, `arah` [gerbang.routes.ts:L33-L41](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/routes/gerbang.routes.ts#L33-L41)

Type aktual di service
- [GerbangTapInput](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/types/gerbang.types.ts#L4-L11)

Contoh body (entry)
```json
{
  "siswa_id": "SISWA_001",
  "arah": "GERBANG_DATANG",
  "device_id": "GATE-01",
  "rfid": "1234567890",
  "waktu_tap": "2026-03-15T06:25:13.000+07:00",
  "is_offline_sync": false
}
```

Contoh body (exit)
```json
{
  "siswa_id": "SISWA_001",
  "arah": "GERBANG_PULANG",
  "device_id": "GATE-01",
  "waktu_tap": "2026-03-15T13:15:30.000+07:00"
}
```

### 3.2 Sesi Tap — POST /api/attendance/sesi-absensi/:id/tap-siswa

Body dibaca langsung dari controller dan diteruskan ke service:
- Controller: [sesi-absensi.controller.ts:L171-L204](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/controllers/sesi-absensi.controller.ts#L171-L204)
- Service expects: `siswa_id`, optional `status`: [sesi.service.ts:L380-L383](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L380-L383)

Contoh body default (auto HADIR / TERLAMBAT dihitung sistem)
```json
{
  "siswa_id": "SISWA_050"
}
```

Contoh body eksplisit status (izin/sakit/dll)
```json
{
  "siswa_id": "SISWA_050",
  "status": "IZIN"
}
```

Catatan penting prerequisite
- Sesi tap mewajibkan “tap gerbang datang” tercatat (cache `gate_present` atau fallback DB read `AbsenGerbangSiswa`):
  - [sesi.service.ts:L418-L441](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L418-L441)

Untuk load test, artinya:
- Test Sesi Tap harus didahului dataset yang sudah “masuk” (gerbang datang) untuk siswa-siswa yang akan tap sesi pada hari yang sama.

---

## 4) Audit Tenant Context (Multi-tenant)

Authority tenant untuk request attendance
- Non-SUPERADMIN: **JWT claim `tenantId`** adalah sumber tenant utama.
- `tenantMiddleware` juga melakukan domain mismatch enforcement (host/subdomain context vs JWT tenant), sehingga untuk load test perlu konsisten terhadap domain.

Kebutuhan header/domain untuk load test
- Pada login, tenant dipilih dari domain/header:
  - `Host` atau `X-Forwarded-Host`
  - atau `X-Tenant-Domain` / `X-Tenant-Sub`
  - Code path: [auth.controller.ts:L991-L1060](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts#L991-L1060)
- Pada request attendance, tetap gunakan domain yang sama (Host) agar tenantMiddleware tidak mendeteksi mismatch.

Rekomendasi untuk k6
- Set base URL sesuai domain tenant (subdomain tenant) jika tersedia.
- Jika test dilakukan via IP/localhost (dev), gunakan:
  - header `X-Tenant-Domain` (untuk login) dan pastikan tenantMiddleware tidak mismatch terhadap token tenantId.

---

## 5) Dataset Simulasi (1 Sekolah)

Target dataset
- 1 tenant (sekolah)
- 1 guru sebagai petugas gerbang (GURU + struktur scope attendance)
- 10 siswa sebagai petugas kelas (SISWA + struktur scope attendance pada kelas target)
- 100 siswa biasa (untuk simulasi volume)

### 5.1 Struktur dataset yang dibutuhkan oleh k6 (tanpa membuat script)
Format yang disarankan (JSON):
```json
{
  "baseUrl": "https://<tenant-domain>",
  "tenant": {
    "id": "<tenantId>",
    "domain": "<tenant-domain>"
  },
  "actors": {
    "guru_gerbang": {
      "email": "gerbang@<tenant-domain>",
      "password": "<pwd>",
      "userId": "<uuid>",
      "guruId": "<uuid>",
      "token": "<jwt>",
      "refreshToken": "<jwt>"
    },
    "petugas_kelas": [
      {
        "email": "petugas01@<tenant-domain>",
        "password": "<pwd>",
        "userId": "<uuid>",
        "siswaId": "<uuid>",
        "kelasId": "<uuid>",
        "token": "<jwt>",
        "refreshToken": "<jwt>"
      }
    ]
  },
  "students": {
    "kelasId": "<uuid>",
    "petugas": ["<siswaId-01>", "<siswaId-02>"],
    "regular": ["<siswaId-11>", "<siswaId-12>"]
  },
  "devices": {
    "gateDevices": ["GATE-01"],
    "rfidPrefix": "RFID-"
  },
  "attendance": {
    "sessionId": "<sesiAbsensiId>"
  }
}
```

### 5.2 Cara memperoleh sessionId (sesi absensi)
Sebelum load test:
- Buat 1 sesi absensi untuk kelas target pada hari test melalui endpoint create sesi:
  - `POST /api/attendance/sesi-absensi`
  - Route: [sesi-absensi.routes.ts:L8-L18](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts#L8-L18)
- Simpan `sessionId` (param `:id`) untuk dipakai pada test “Sesi Tap”.

### 5.3 Validasi dataset minimal sebelum mulai load test
- Pastikan tenant plan punya capability ABSENSI (capability guard modul).
- Pastikan semua siswa “tap gerbang datang” sudah dilakukan untuk hari yang sama (untuk Test 2/3).

---

## 6) Skenario Load Test (k6) — Rencana Tanpa Script

### Test 1 — Gerbang Tap (realistic arrival burst)
Tujuan
- Menguji write throughput `AbsenGerbangSiswa` + publish realtime + emitDomainEvent side-effect.

Simulasi
- 1000 siswa masuk dalam 15 menit.

Traffic model (disarankan)
- Arrival-rate ramp:
  - 0 → 2 rps (30s warmup)
  - 2 → 10 rps (5m)
  - 10 → 20 rps (5m)
  - 20 rps steady (5m)

Request pattern
- Actor: token `guru_gerbang` (atau admin, jika ingin baseline permission sederhana)
- Body:
  - `arah = GERBANG_DATANG`
  - `siswa_id` bervariasi
  - `device_id = GATE-01`
  - optional `rfid` unik untuk variasi payload

Kriteria sukses
- 99% response < target latency (ditentukan tim; mis. <500ms)
- error rate rendah (401/403/409 harus dianalisis)

### Test 2 — Sesi Tap (classroom spike)
Tujuan
- Menguji write throughput `AbsenSiswa` pada spike yang tajam (30 siswa/10 detik).

Prasyarat wajib
- Siswa-siswa yang akan tap sesi sudah “gate present” pada hari yang sama.
- `sessionId` fixed (sesi yang sama).

Simulasi
- 30 siswa melakukan tap dalam 10 detik (≈3 rps tapi spike paralel).

Request pattern
- Actor: token `petugas_kelas[i]` (SISWA petugas) atau 1 petugas yang melakukan scan banyak siswa (sesuai implementasi, endpoint menerima siswa_id sehingga 1 petugas bisa scan banyak siswa).
- Body: `{ siswa_id: "<id>" }`

Kriteria sukses
- Tidak ada error “Gate belum tercatat” (kalau muncul, dataset/prasyarat gagal)
- Tidak ada queue-based write untuk AbsenSiswa (harus direct DB write)

### Test 3 — Stress Test (high sustained)
Tujuan
- Menguji batas sistem pada taps per second.

Simulasi
- 100 taps per second selama 60 detik.

Catatan implementasi
- Aplikasi memiliki endpoint internal “stress session enqueue” yang menulis ke attendance queue, tapi itu bukan flow produksi tap.
  - Jangan gunakan endpoint ini untuk test produksi; gunakan endpoint produksi `/attendance/gerbang/tap` dan `/attendance/sesi-absensi/:id/tap-siswa`.

Kriteria sukses
- Monitoring DB (CPU/IO/locks) stabil
- Tidak ada peningkatan error 5xx signifikan

---

## 7) Rencana Script k6 (outline saja)

File input (akan dipakai nanti)
- `docs/load-test/datasets/attendance_dataset.json` (disarankan dibuat manual dari hasil audit ini)

Lifecycle token
- Setup k6:
  - login untuk dapat token (atau read token dari dataset)
  - refresh token setiap ±12 menit jika test durasi panjang

Headers standar
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `Host: <tenant-domain>` (penting jika environment enforce domain mismatch)

Output metrics yang harus dicatat
- latency p50/p95/p99 per endpoint
- error breakdown per status code
- DB write rate (opsional via dashboard/monitoring)
- queue lag untuk notification (untuk side-effect, bukan untuk attendance write)

