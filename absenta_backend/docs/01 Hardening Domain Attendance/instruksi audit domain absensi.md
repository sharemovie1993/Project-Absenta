Audit Global Domain Absensi (untuk TRAE)

Pertanyaan ini sengaja dibuat high level tetapi berbasis kode agar AI agent tidak salah tafsir.

Anda bisa kirimkan ke TRAE seperti ini.

1️⃣ Entry Point Absensi

Audit seluruh entry point absensi pada kode.

Pertanyaan:

file controller/service apa saja yang menjadi entry point untuk:

absensi gerbang

absensi sesi/kelas

endpoint API apa saja yang digunakan

alur dari controller → service → repository

Tujuan audit:

memastikan tidak ada jalur absensi yang bypass validasi utama
2️⃣ Flow Pencatatan Absensi Gerbang

Audit implementasi aktual pada kode:

fungsi yang mencatat absensi gerbang

apakah menggunakan transaksi

apakah idempotent (upsert atau insert)

field unik apa yang mencegah duplicate

Hal yang perlu diverifikasi dari kode:

device retry
duplicate request
race condition
3️⃣ Flow Validasi Absensi Sesi

Audit bagaimana sistem memvalidasi bahwa siswa sudah absen gerbang.

Periksa pada kode:

apakah validasi membaca DB langsung

apakah sudah menggunakan cache (Redis flag)

query apa yang digunakan

index apa yang digunakan pada tabel

Tujuan audit:

mencegah bottleneck DB saat burst session attendance
4️⃣ Konsistensi Event Gerbang → Sesi

Audit apakah ada kemungkinan kondisi berikut:

gerbang sudah tap
tetapi record belum commit
lalu sesi ditolak

Hal yang perlu dicek pada kode:

commit timing

worker dependency

race condition antar request

5️⃣ Idempotency dan Retry Safety

Audit apakah implementasi absensi aman terhadap retry device.

Periksa pada kode:

apakah menggunakan upsert

apakah ada unique constraint

apakah ada idempotency key

Tujuan:

duplicate request tidak membuat duplicate attendance
6️⃣ Dependency ke Worker Queue

Audit apakah jalur absensi gerbang bergantung pada worker.

Periksa:

apakah worker diperlukan untuk commit absensi

atau hanya untuk proses turunan (log, notif, analytics)

Tujuan:

gerbang harus tetap sukses walau worker overload
7️⃣ Latency Jalur Gerbang

Audit jalur kode gerbang dan identifikasi operasi yang terjadi sebelum response API.

Periksa apakah jalur gerbang melakukan:

query tambahan

logging sinkron

integrasi eksternal

operasi berat lainnya

Tujuan:

menjaga latency rendah saat jam sibuk
8️⃣ Struktur Data Absensi

Audit model database yang digunakan.

Periksa:

tabel absensi gerbang

tabel absensi sesi

primary key

index yang digunakan

Tujuan:

memastikan query validator tetap cepat saat data bertambah besar
9️⃣ Potensi Race Condition

Audit apakah ada kemungkinan kondisi berikut:

dua request absensi bersamaan

contoh:

double tap RFID
network retry
multi device

Periksa apakah implementasi sudah aman.

🔟 Integritas Data Multi Tenant

Karena ini SaaS.

Audit apakah semua query absensi selalu memfilter:

tenant_id

Tujuan:

mencegah data antar sekolah tercampur