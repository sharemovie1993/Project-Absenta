Laporan Implementasi — Redis HA-Ready Configuration (Sentinel / Cluster Compatible)

Ringkasan Perubahan
- Menambahkan Redis Connection Factory terpusat berbasis ioredis yang mendukung mode: single, sentinel, cluster (via REDIS_MODE).
- Memigrasikan komponen berikut agar memakai connection dari factory:
  - BullMQ Queue (connection dari src/queue/redis.ts)
  - Event Bus (Redis Pub/Sub)
  - Distributed Scheduler Lock
  - Cache utilities
  - Restore progress Pub/Sub (SSE)
- Menambahkan log startup mode: redis_mode_single / redis_mode_sentinel / redis_mode_cluster.
- Memperbarui validasi env agar menyesuaikan kebutuhan env Redis berdasarkan REDIS_MODE.
- Memperbarui .env.example untuk menambahkan konfigurasi REDIS_MODE + variabel Sentinel/Cluster.

Lokasi Perubahan Utama
- src/infra/redis/redisClient.ts
- src/queue/redis.ts
- src/infra/event-bus/redis.subscriber.ts
- src/utils/cache.service.ts
- src/main.ts
- src/infra/locks/distributedLock.ts (menggunakan redis dari queue)
- src/infra/lock/redis-lock.service.ts (menggunakan factory)
- src/infra/redis/redis-subscriber.ts (menggunakan factory)
- src/modules/backup/services/restore.service.ts
- src/modules/backup/restore.worker.ts
- src/config/env.ts
- .env.example

Konfigurasi Environment
- Single (default)
  - REDIS_MODE=single
  - REDIS_URL=redis://...
  - REDIS_PASSWORD= (optional)
- Sentinel
  - REDIS_MODE=sentinel
  - REDIS_SENTINEL_HOSTS=host1:26379,host2:26379,host3:26379
  - REDIS_SENTINEL_NAME=mymaster
  - REDIS_PASSWORD= (optional)
- Cluster
  - REDIS_MODE=cluster
  - REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
  - REDIS_PASSWORD= (optional)

Build
- npm run build: SUCCESS

