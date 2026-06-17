Instruksi Implementasi – Redis HA-Ready Configuration (Sentinel / Cluster Compatible)

Platform Absenta saat ini menggunakan Redis single instance untuk beberapa komponen penting:

* BullMQ Queue
* Event Bus (Pub/Sub)
* Distributed Scheduler Lock
* Cache

Saat ini Redis berjalan dalam mode single instance pada satu VPS.
Namun untuk mempersiapkan platform menuju deployment multi-node di masa depan, backend harus dibuat **HA-ready** tanpa mengubah perilaku sistem yang sedang berjalan.

Tujuan implementasi:

1. Menambahkan dukungan konfigurasi Redis High Availability (Sentinel dan Cluster).
2. Memastikan platform tetap berjalan normal dengan Redis single instance saat ini.
3. Memastikan bahwa ketika Redis Sentinel atau Redis Cluster digunakan di masa depan, tidak diperlukan perubahan kode lagi — hanya perubahan konfigurasi environment.

Scope perubahan:

infra redis client
queue configuration (BullMQ)
event bus configuration
distributed lock configuration

Langkah implementasi:

Buat Redis Connection Factory terpusat.

Lokasi file:

src/infra/redis/redisClient.ts

Factory ini harus membaca environment variable REDIS_MODE untuk menentukan jenis koneksi Redis.

Tambahkan konfigurasi environment berikut:

REDIS_MODE=single | sentinel | cluster

Mode default harus tetap:

REDIS_MODE=single

Jika REDIS_MODE=single:

gunakan konfigurasi Redis seperti yang digunakan saat ini.

Gunakan:

REDIS_URL

untuk membuat koneksi Redis standar.

Jika REDIS_MODE=sentinel:

tambahkan environment variable berikut:

REDIS_SENTINEL_HOSTS
REDIS_SENTINEL_NAME
REDIS_PASSWORD (opsional)

Contoh format:

REDIS_SENTINEL_HOSTS=host1:26379,host2:26379,host3:26379
REDIS_SENTINEL_NAME=mymaster

Redis client harus membuat koneksi menggunakan sentinel configuration.

Jika REDIS_MODE=cluster:

tambahkan environment variable berikut:

REDIS_CLUSTER_NODES

Contoh format:

REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379

Redis client harus membuat koneksi menggunakan cluster configuration.

Setelah Redis Connection Factory dibuat, pastikan seluruh komponen platform menggunakan client dari factory ini.

Komponen yang harus menggunakan Redis factory:

BullMQ Queue
Event Bus (Redis Pub/Sub)
Distributed Lock Service
Cache utilities

Pastikan tidak ada modul yang membuat koneksi Redis langsung menggunakan new Redis() tanpa melalui factory.

Tambahkan logging saat aplikasi start untuk menunjukkan mode Redis yang digunakan.

Contoh log:

redis_mode_single
redis_mode_sentinel
redis_mode_cluster

Verifikasi:

Aplikasi harus tetap berjalan normal dengan konfigurasi saat ini:

REDIS_MODE=single

Worker queue harus tetap berjalan normal.

Event bus harus tetap dapat publish dan subscribe.

Distributed scheduler lock harus tetap berfungsi.

Constraint:

Tidak boleh mengubah behaviour sistem saat ini.

Tidak boleh mengubah struktur database.

Tidak boleh mengubah API endpoint.

Perubahan hanya menambahkan fleksibilitas konfigurasi Redis.

Tujuan akhir implementasi ini adalah menjadikan platform **Redis HA-ready** sehingga saat platform berpindah ke Redis Sentinel atau Redis Cluster di masa depan, hanya perubahan environment configuration yang diperlukan tanpa perubahan kode.
