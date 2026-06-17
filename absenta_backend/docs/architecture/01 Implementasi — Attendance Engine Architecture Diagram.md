Instruksi Implementasi — Attendance Engine Architecture Diagram

Tujuan instruksi ini adalah menghasilkan dokumentasi arsitektur aktual dari modul attendance berdasarkan implementasi kode saat ini.

Diagram harus dibuat berdasarkan code tracing, bukan asumsi arsitektur.

LINGKUP ANALISIS

Modul yang harus dianalisis:

src/modules/attendance/gerbang
src/modules/attendance/sesi-absensi

Job yang juga harus dianalisis:

src/jobs/attendanceAutoClose.job.ts

---

1. TRACE CRITICAL PATH

Telusuri alur endpoint berikut:

POST /api/attendance/gerbang/tap
POST /api/attendance/sesi-absensi/:id/tap-siswa

Identifikasi:

controller
service
repository
prisma write

Pastikan diagram menunjukkan bahwa write attendance terjadi langsung ke DB.

---

2. TRACE SIDE EFFECT FLOW

Telusuri event yang dipublish setelah write attendance:

attendance.tap
attendance.session.tap

Identifikasi:

emitDomainEvent
event consumer
queue usage
worker usage
notification flow

---

3. TRACE REDIS USAGE

Identifikasi semua penggunaan redis pada attendance engine:

lock mechanism
gate_present cache
realtime publish

---

4. TRACE BACKGROUND JOB

Analisis job berikut:

attendanceAutoClose.job.ts

Identifikasi:

kapan job berjalan
apakah menulis AbsenSiswa
peran job dalam sistem attendance

---

OUTPUT

Buat dokumen baru:

docs/architecture/ATTENDANCE_ENGINE_ARCHITECTURE.md

Dokumen harus berisi:

1. Ringkasan arsitektur attendance engine
2. Diagram flow gerbang tap
3. Diagram flow sesi tap
4. Diagram side-effect worker flow
5. Diagram background reconciliation flow
6. Daftar file yang terlibat dalam critical path

---

FORMAT DIAGRAM

Gunakan Mermaid flowchart.

Contoh format:

flowchart TD
RFID[RFID Tap] --> API
API --> Controller
Controller --> Service
Service --> Repository
Repository --> PostgreSQL
PostgreSQL --> Response

Setiap diagram harus mencerminkan implementasi kode aktual.

---

Status Implementasi

DONE
- Output dibuat: docs/architecture/ATTENDANCE_ENGINE_ARCHITECTURE.md
