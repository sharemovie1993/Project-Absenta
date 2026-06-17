Context

Kita sedang berada pada tahap hardening sistem Absenta SaaS yang menargetkan ribuan sekolah dengan burst traffic tinggi saat jam gerbang dan awal sesi kelas.

Audit global domain absensi sudah dilakukan. Sekarang kita membutuhkan Audit Hardening Level-2 yang lebih dalam berbasis implementasi kode.

Jawaban harus berbasis kode, bukan desain atau dokumentasi.

Untuk setiap temuan:

sertakan file path

sertakan line reference

jelaskan risiko saat sistem berada pada load tinggi

Scope Audit

Fokus audit pada modul berikut:

src/modules/attendance/gerbang
src/modules/attendance/sesi-absensi
prisma/schema.prisma

Tujuan audit adalah menemukan:

race condition
transaction bottleneck
query inefficiency
burst-load vulnerability
tenant isolation issues
cache misuse
1️⃣ Transaction Scope Audit

Audit semua transaksi database yang terjadi pada jalur:

gerbang.service.tap
sesi.service.tapSiswa

Untuk setiap transaksi:

Laporkan:

operasi apa saja yang berada dalam transaction scope

apakah ada operasi yang seharusnya berada di luar transaction

apakah transaction scope terlalu besar

apakah transaction bisa menyebabkan lock contention saat burst

Berikan contoh:

file
line
operation
risk explanation
2️⃣ Query Efficiency Audit

Audit semua query database yang terjadi pada jalur:

tap gerbang
tap sesi

Periksa:

SELECT
INSERT
UPSERT
UPDATE

Untuk setiap query:

Laporkan:

apakah query sudah menggunakan index yang tepat

apakah ada potensi full table scan

apakah ada query yang bisa menjadi hotspot saat jam sibuk

Jika memungkinkan, jelaskan perkiraan query frequency saat burst traffic.

3️⃣ DB Write Burst Risk

Simulasikan secara logika implementasi kode untuk skenario berikut:

2000 sekolah
1000 siswa
absen gerbang dalam 20 menit

Audit apakah implementasi berikut aman:

AbsenGerbangSiswa.upsert

Periksa:

apakah ada kemungkinan write contention

apakah upsert key sudah optimal

apakah transaction isolation dapat menyebabkan blocking

Laporkan potensi bottleneck.

4️⃣ Cache Layer Inspection

Audit penggunaan Redis pada:

gerbang.service
sesi.service

Periksa:

session caching
locking
duplicate prevention

Laporkan:

apakah cache bisa menjadi single point bottleneck

apakah ada race condition pada cache logic

apakah ada missing TTL

apakah ada cache key collision antar tenant

Berikan referensi kode.

5️⃣ Race Condition Deep Inspection

Audit kemungkinan race condition pada skenario berikut:

Scenario A
tap gerbang
tap sesi
hampir bersamaan
Scenario B
device retry
double tap RFID
Scenario C
dua worker memproses request yang sama

Periksa apakah implementasi saat ini benar-benar aman.

Jika ada kemungkinan race, jelaskan:

bagaimana race terjadi
di file mana
pada line mana
6️⃣ Multi-Tenant Isolation Audit

Audit apakah semua query absensi:

gerbang
sesi

benar-benar terisolasi oleh:

tenant_id

Periksa:

apakah ada query yang hanya menggunakan id

apakah ada lookup yang tidak memfilter tenant

Laporkan semua potensi tenant data leakage risk.

7️⃣ Latency Critical Path Audit

Audit jalur request berikut:

POST /attendance/gerbang/tap
POST /attendance/sesi-absensi/:id/tap-siswa

Identifikasi semua operasi yang terjadi sebelum response API dikirim.

Laporkan:

DB queries
validation logic
config lookup
external dependency

Tujuan audit:

menemukan operasi yang dapat memperlambat response saat burst traffic.

8️⃣ Memory & Object Allocation

Audit apakah ada operasi pada jalur gerbang/sesi yang:

membuat object besar
melakukan serialization berat
melakukan deep clone

yang dapat menyebabkan:

GC pressure
memory spike

Laporkan jika ditemukan.

9️⃣ Worker Dependency Check

Pastikan bahwa jalur berikut tidak bergantung pada worker queue untuk commit data:

gerbang attendance
sesi attendance

Audit apakah ada kode yang:

menunggu worker
menggunakan await pada queue job

sebelum response dikirim.

🔟 SaaS Scalability Risk

Berdasarkan implementasi kode saat ini, identifikasi 3 risiko terbesar untuk skala SaaS ribuan sekolah.

Setiap risiko harus disertai:

kode referensi
kenapa ini berbahaya
kapan masalah ini muncul
Output Format

Jawaban harus menggunakan format berikut:

FINDING #1
Location:
file + line

Code snippet (jika perlu)

Risk:
penjelasan risiko saat load tinggi

Recommendation:
opsional
Catatan Penting

Jawaban harus berbasis kode aktual, bukan teori atau desain.

Jika suatu area sudah aman, jelaskan mengapa implementasi tersebut aman dengan referensi kode.