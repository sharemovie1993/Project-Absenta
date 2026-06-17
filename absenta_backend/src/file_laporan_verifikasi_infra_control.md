Verifikasi Dashboard Infra Control (No Mock Data) — Laporan

- Verifikasi Redis keys node:*:heartbeat, worker:*:*:heartbeat, autoscaler:events, queue_history:* melalui koneksi runtime.
- Verifikasi heartbeat node & worker berubah (update) dalam interval ~10 detik.
- Verifikasi queue_history:attendance terisi dan autoscaler:events terisi.
- Verifikasi endpoint backend /admin/infra/* digunakan oleh halaman /superadmin/infra/jobs.
- Verifikasi frontend /superadmin/infra/jobs tidak menggunakan mock/placeholder dan memakai polling 5 detik.
- Perbaikan backend: format payload queue_history mendukung {timestamp, queueLength} (tetap kompatibel dengan {t, q}).
- Perbaikan backend: metrik panjang queue membaca dari BullMQ dan juga mendukung fallback Redis list *\u005fqueue serta bull:*:wait.

REDIS_KEYS_OK
HEARTBEAT_OK
QUEUE_METRICS_OK
AUTOSCALER_EVENTS_OK
API_ENDPOINTS_OK
FRONTEND_NO_MOCK_DATA
REALTIME_REFRESH_OK
