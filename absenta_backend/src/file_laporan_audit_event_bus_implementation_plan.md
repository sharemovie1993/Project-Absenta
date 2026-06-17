Laporan Audit — Event Bus Implementation Plan (Absenta Backend)

Ruang lingkup: merancang standar implementasi event-driven communication untuk platform Absenta (publish/subscribe/emitter/consumer/event-bus layer) berdasarkan mekanisme yang sudah ada. Tidak ada refactor kode bisnis, tidak ada perubahan API endpoint, tidak ada perubahan database schema, tidak ada perubahan konfigurasi worker.

---

1) EVENT PUBLISHER MAP

| event_name / channel | publisher_location | transport |
|---|---|---|
| events:gerbang_tap_update | attendance/gerbang (controller + service) | redis pub/sub |
| events:sesi_status_update | attendance/sesi-absensi (service) + attendanceAutoClose job | redis pub/sub |
| events:session_attendance_update | attendance/sesi-absensi (service) | redis pub/sub |
| events:sesi_summary_update | attendanceAutoClose job | redis pub/sub |
| events:parent_notification | parent-app (parent-notification service) | redis pub/sub |
| restore:progress:{backupId} | backup (restore.service + restore.worker) | redis pub/sub |
| infra-control | infra-command.service | redis pub/sub |
| worker-control | infra/autoHealScheduler | redis pub/sub |
| emailQueue (SEND_EMAIL) | invoice service / payment integration / notification worker | queue (bullmq) |
| attendance queue jobs | scheduler/jobs + router stress endpoint | queue (bullmq) |
| billing queue jobs | scheduler/jobs | queue (bullmq) |
| recurring queue jobs | recurringBilling job | queue (bullmq) |
| analytics queue jobs | schedulers | queue (bullmq) |
| parent-notification queue jobs | attendance (gerbang/sesi) | queue (bullmq) |
| invoice-pdf queue jobs | invoice service | queue (bullmq) |
| mou-pdf queue jobs | document-center | queue (bullmq) |
| tenant-onboarding queue jobs | auth | queue (bullmq) |
| restore queue jobs | backup | queue (bullmq) |
| payment.status.updated.* | payment workflow | in-process event emitter |

---

2) EVENT SUBSCRIBER MAP

| event_name / channel | subscriber_service | transport |
|---|---|---|
| events:sesi_summary_update | infra/event-bus subscriber | redis pub/sub |
| events:session_attendance_update | infra/event-bus subscriber | redis pub/sub |
| events:sesi_status_update | infra/event-bus subscriber | redis pub/sub |
| events:gerbang_tap_update | infra/event-bus subscriber | redis pub/sub |
| events:session_attendance_update | websocket relay (socket.events) | redis pub/sub |
| events:parent_notification | websocket relay (socket.events) | redis pub/sub |
| restore:progress:{backupId} | backup restore SSE (restore.progress.routes) | redis pub/sub |
| infra-control | infra/control-agent | redis pub/sub |
| worker-control | infra worker agent/autoscaler | redis pub/sub |
| emailQueue | worker.ts + notification-worker | queue (bullmq) |
| attendance | attendance-worker | queue (bullmq) |
| billing | billing-worker | queue (bullmq) |
| recurring | recurring-worker | queue (bullmq) |
| notification (general) | notification-worker | queue (bullmq) |
| parent-notification | modules/notification/notification.worker | queue (bullmq) |
| invoice-pdf | invoice-pdf worker (embedded atau separate) | queue (bullmq) |
| mou-pdf | mou-pdf worker (embedded atau maintenance-worker) | queue (bullmq) |
| tenant-onboarding | tenant-onboarding worker (embedded atau maintenance-worker) | queue (bullmq) |
| restore | restore.worker | queue (bullmq) |
| payment.status.updated.* | internal listeners (jika dipasang) | in-process event emitter |

---

3) EVENT EMITTER STANDARD

Target standar yang disarankan:
- Fungsi: emitDomainEvent(event_type, payload, options?)
- Required fields minimal (sesuai spesifikasi event): event_id, event_type, tenant_id, timestamp, source_service, payload, metadata
- Error handling:
  - Mode best-effort untuk redis pub/sub realtime (gagal publish tidak memblokir transaksi inti)
  - Mode reliable untuk event yang harus durable (gunakan queue sebagai transport, dengan retry + dead-letter policy)
- Routing transport:
  - Realtime channel: redis pub/sub (untuk UI update, monitoring, SSE)
  - Durable workflow: queue (bullmq) (untuk pengiriman notifikasi, billing recurring, pdf generation, onboarding)
- Idempotency:
  - options.idempotency_key (atau metadata.idempotency_key) untuk konsumen agar aman reprocess
  - options.correlation_id untuk tracing lintas service/worker

---

4) EVENT CONSUMER STANDARD

Target standar yang disarankan:
- Fungsi: onEvent(event_type, handler, options?)
- Subscription pattern:
  - Redis pub/sub: subscriber mendaftarkan handler per channel (atau pola prefix)
  - Queue: worker mendaftarkan handler per job_name yang merepresentasikan event_type
- Retry strategy:
  - Queue: gunakan retry bawaan BullMQ (attempts + backoff) dan simpan failed jobs (bounded) untuk inspeksi
  - Pub/sub: tidak ada retry durable; jika butuh retry maka event harus dialihkan ke queue
- Error handling:
  - Handler melempar error agar queue melakukan retry
  - Logging wajib menyertakan tenant_id + correlation_id + event_id
- Batasan penting:
  - Konsumen worker tidak boleh bergantung pada request context API
  - Konsumen realtime tidak melakukan side-effect bisnis kritikal (hanya broadcast/telemetry)

---

5) EVENT BUS ARCHITECTURE

Desain layer event-bus yang memenuhi blueprint (tanpa dependency ke domain modules):
- Publisher interface:
  - publishRealtime(event): untuk redis pub/sub (non-durable)
  - enqueueEvent(event, queue_name): untuk durable processing (worker)
- Subscriber interface:
  - subscribeRealtime(channel, handler): untuk redis pub/sub
  - registerWorkerHandlers(queue_name, handlers): untuk worker (bullmq)
- Transport layer:
  - Redis Pub/Sub untuk realtime & fan-out ringan
  - BullMQ queue untuk event yang perlu retry/durability
  - In-process EventEmitter dibatasi untuk modul internal non-distributed; tidak dianggap sebagai event-bus platform

Gap terhadap blueprint (yang perlu ditangani di fase refactor berikutnya):
- infra/event-bus saat ini melakukan side-effect lintas domain dan mengimpor domain modules (perlu dipindahkan ke consumer yang berada di domain/worker, sementara infra cukup menyediakan plumbing publish/subscribe).

