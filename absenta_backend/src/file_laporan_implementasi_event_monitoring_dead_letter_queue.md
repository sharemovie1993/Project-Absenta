Laporan Implementasi — Event Monitoring & Dead Letter Queue

- Tambah DLQ queue: attendance_dlq, billing_dlq, notification_dlq.
- Update worker queue agar mencatat metric log (event_type, processing_time, retry_count, worker_name) dan memindahkan job ke DLQ setelah retry maksimum.
- Tambah endpoint internal monitoring: /internal/events/metrics.

Build: SUCCESS
Errors Remaining: NO
