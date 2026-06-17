BATCH 4 — Final Hardening & Scalability (Patch16–Patch20)

Context
Sistem Absenta sudah melalui Batch-1, Batch-2, dan Batch-3 hardening.
Batch ini fokus pada long-term scalability tanpa mengubah behaviour bisnis.

Perubahan harus:

minimal
safe for production
tanpa refactor besar

=======================================================================
PATCH 16 — Prisma Query Parallelization

Context
Beberapa query pada jalur sesi masih dijalankan secara serial.

Location

src/modules/attendance/sesi-absensi/services/sesi.service.ts

Task

Jalankan query independen secara paralel menggunakan Promise.all.

Contoh kasus:

BEFORE

const siswa = await prisma.siswa.findUnique(...);
const siswaAkademik = await prisma.siswaAkademik.findFirst(...);
const existingAbsen = await prisma.absenSiswa.findFirst(...);

AFTER

const [siswa, siswaAkademik, existingAbsen] = await Promise.all([
  prisma.siswa.findUnique(...),
  prisma.siswaAkademik.findFirst(...),
  prisma.absenSiswa.findFirst(...)
]);

Tujuan

mengurangi latency request
mengurangi connection wait time

Batasan

hanya query yang tidak saling bergantung

jangan ubah logic validasi

Output

patch before/after

=======================================================================
PATCH 17 — Prisma Connection Pool Safety

Context
Saat burst attendance, pool connection database bisa cepat penuh.

Location

src/lib/prisma.ts
atau prisma client initialization

Task

Pastikan Prisma menggunakan connection pool limit yang aman.

Tambahkan konfigurasi environment default jika belum ada.

Contoh:

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

dan di env:

DATABASE_URL=postgresql://...&connection_limit=20&pool_timeout=20

Jika project sudah menggunakan Prisma pool default, pastikan connection_limit tidak terlalu besar.

Tujuan

mencegah pool exhaustion saat burst

Output

konfirmasi konfigurasi pool

=======================================================================
PATCH 18 — Attendance Feed Build Debounce

Context
Patch6 sudah menambahkan throttle realtime, namun buildAttendanceFeed() masih dipanggil untuk setiap socket.

Location

gerbang.controller.ts

Task

Bangun feed sekali saja per event, lalu kirim ke semua socket.

BEFORE

for (const s of sockets) {
  const feed = await buildAttendanceFeed(...);
  s.emit('attendance_feed_update', feed);
}

AFTER

const feed = await buildAttendanceFeed(...);

for (const s of sockets) {
  s.emit('attendance_feed_update', feed);
}

Tujuan

mengurangi CPU usage saat banyak socket

Batasan

jangan ubah payload event

jangan ubah logic feed

Output

patch before/after

=======================================================================
PATCH 19 — Redis Key Namespace Safety

Context
Untuk SaaS multi-tenant, Redis key harus jelas namespace-nya.

Location

semua penggunaan redis key attendance

Task

Pastikan semua key attendance menggunakan prefix.

Format yang diinginkan:

absenta:gate_present:{tenant}:{date}:{siswa}

BEFORE

gate_present:{tenant}:{date}:{siswa}

AFTER

absenta:gate_present:{tenant}:{date}:{siswa}

Tujuan

mencegah collision key dengan modul lain

Batasan

ubah hanya prefix key

tidak mengubah logic

Output

patch before/after

=======================================================================
PATCH 20 — Logging Level Safety

Context
Log verbose dapat menjadi bottleneck saat burst traffic.

Location

src/utils/cache.service.ts
src/modules/attendance/*

Task

Pastikan semua log debug menggunakan conditional log level.

BEFORE

console.log("cache hit", key);

AFTER

if (process.env.LOG_LEVEL === "debug") {
  console.log("cache hit", key);
}

Tujuan

menghindari stdout bottleneck

Batasan

jangan hapus log

hanya gating log level

Output

patch before/after