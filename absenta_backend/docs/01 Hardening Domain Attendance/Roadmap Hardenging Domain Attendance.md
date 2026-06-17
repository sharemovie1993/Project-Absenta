Roadmap Hardening Absenta (No Downtime Strategy)

Prinsip utama roadmap ini:

1. perbaiki risk paling berbahaya dulu
2. jangan ubah behaviour domain
3. perubahan kecil tapi berdampak besar

Urutan tahap:

Stage 1 → Safety Fix
Stage 2 → Critical Path Optimization
Stage 3 → DB Load Reduction
Stage 4 → Cache & Redis Hardening
Stage 5 → Long-term Scalability
STAGE 1 — Safety Fix (Immediate)

Target: menutup bug keamanan dan race fatal

Ini harus dilakukan pertama karena tidak mengubah behaviour bisnis.

1️⃣ Tambahkan tenant filter di semua query domain

Masalah audit:

lookup siswa tanpa tenant filter
lookup gateTap tanpa tenant filter

Semua query harus seperti ini:

where: {
  tenant_id: tenantId,
  ...
}

Area yang harus dicek:

gerbang.controller.ts
sesi.service.ts
gerbang.service.ts
2️⃣ Tambahkan unique constraint untuk sesi gerbang

Di schema.prisma:

model SesiGerbang {
  id        String   @id @default(uuid())
  tenant_id String
  tanggal   DateTime

  @@unique([tenant_id, tanggal])
}

Migration aman karena:

tidak mengubah data existing

Jika ada duplicate data lama:

hapus duplicate sebelum migration
3️⃣ Redis KEYS → SCAN

Ganti:

client.keys(pattern)

menjadi:

SCAN cursor MATCH pattern COUNT 100

Keuntungan:

non-blocking Redis
STAGE 2 — Critical Path Optimization

Target: jalur gerbang harus ultra cepat

Temuan paling penting audit.

4️⃣ realtime socket harus non-blocking

Sekarang:

await redis.publish(...)
await socket.emit(...)
await fetchSockets(...)

Harus menjadi:

redis.publish(...).catch(...)
socket.emit(...)

atau:

setImmediate(() => publishEvent())

Prinsip:

response API tidak boleh menunggu realtime event

Flow baru:

tap
↓
DB commit
↓
response
↓
async realtime event
5️⃣ minimal response untuk device

Saat ini response payload cukup besar.

Device cukup menerima:

{
  "status": "OK",
  "timestamp": "...",
  "type": "DATANG"
}

Metadata besar hanya untuk dashboard.

STAGE 3 — DB Load Reduction

Target: mengurangi query DB saat burst

Ini sangat penting untuk SaaS ribuan sekolah.

6️⃣ Redis gate_present flag

Saat gerbang sukses:

SET gate_present:{tenant}:{date}:{student} = 1
TTL end_of_day

Session validation:

GET gate_present

Jika miss:

fallback DB

Keuntungan:

mengurangi jutaan query DB
7️⃣ hapus duplicate pre-check

Sekarang:

checkDuplicateTap
↓
upsert

Ini tidak perlu.

Lebih baik:

INSERT
↓
catch unique error

Ini pattern yang dipakai banyak sistem besar.

8️⃣ perkecil transaction scope

Jangan lakukan banyak read dalam transaction.

Ubah:

read config
read kelas
read tahun
transaction
insert

Menjadi:

read config
read kelas
insert (transaction minimal)
STAGE 4 — Cache & Redis Hardening

Target: Redis tetap stabil saat traffic tinggi

9️⃣ cache stampede protection

Masalah sekarang:

100 request
cache miss
↓
100 DB query

Solusi:

singleflight lock

Pseudo:

if (cacheMiss) {
   acquireLock(key)
   fetchDB()
   setCache()
   releaseLock()
}
🔟 matikan log cache

Sekarang:

console.log cache hit/miss

Saat burst:

stdout bottleneck

Gunakan:

log level DEBUG

atau disable default.

STAGE 5 — Long-Term Scalability

Ini bukan bug fix, tapi persiapan SaaS skala besar.

1️⃣1️⃣ Redis session cache

Cache:

activeYear
activeSemester
systemConfig

TTL:

1 – 5 menit

Ini mengurangi query kecil tapi sering.

1️⃣2️⃣ DB partition untuk absensi

Tabel:

AbsenGerbangSiswa
AbsenSiswa

akan menjadi sangat besar.

Partition:

per bulan
atau per tanggal

Contoh:

absen_gerbang_2026_03
1️⃣3️⃣ optional: event streaming

Jika nanti load sangat besar:

redis pubsub
↓
event stream
↓
worker

Tapi ini tidak perlu sekarang.

Hasil setelah roadmap selesai

Jika semua tahap dilakukan, sistem Anda akan berubah dari:

SaaS-ready

menjadi:

High-scale SaaS ready

Perkiraan kapasitas:

500 – 2000 sekolah aktif

tanpa perubahan arsitektur besar.

Risiko perubahan

Semua tahap di atas:

tidak mengubah domain logic

jadi:

safe untuk sistem production

selama dilakukan bertahap.

Saran implementasi praktis

Developer TRAE bisa mengerjakan roadmap ini dalam 3 sprint kecil:

Sprint 1
Stage 1 + Stage 2

Sprint 2
Stage 3

Sprint 3
Stage 4 + Stage 5