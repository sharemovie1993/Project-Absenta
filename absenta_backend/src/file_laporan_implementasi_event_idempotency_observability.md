Laporan Implementasi — Event Idempotency & Observability

- Tambahkan metadata otomatis pada setiap domain event (correlation_id, idempotency_key) pada emitDomainEvent.
- Update seluruh consumer domain event agar memakai idempotency_key untuk dedup dan mencatat log standar (event_type, tenant_id, correlation_id, worker_name).
- Tambahkan logging standar pada worker queue (attendance-worker, billing-worker, notification-worker) termasuk error logging dengan metadata.
- Propagasi correlation_id dari event billing.invoice.requested ke event billing.invoice.generated.

Build: SUCCESS
Errors Remaining: NO
