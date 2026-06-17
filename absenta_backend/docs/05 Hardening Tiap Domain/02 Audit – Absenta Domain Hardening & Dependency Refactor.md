Instruksi Audit – Absenta Domain Hardening & Dependency Refactor

Audit tahap pertama telah memetakan domain modules, event producers, workers, dan dependency graph.

Audit tahap kedua bertujuan untuk mengidentifikasi masalah arsitektur yang menghambat skalabilitas jangka panjang.

Fokus audit ini adalah:

* circular dependency
* service decomposition
* event architecture consistency
* controller boundary violation
* domain coupling

LINGKUP AUDIT

Audit harus fokus pada module yang berstatus NEEDS REFACTOR:

academic
attendance
auth
billing
invoice
notification
parent-app
payment
superadmin

CIRCULAR DEPENDENCY ANALYSIS

Audit dependency berikut:

parent-app → attendance → auth → notification → parent-app
academic → parent-app → attendance → auth → academic
invoice → pdf → invoice

Temukan secara detail:

* file yang melakukan import
* service call yang menyebabkan dependency
* apakah dependency terjadi karena event atau direct service call

Buat dependency breakdown untuk setiap siklus.

SERVICE DECOMPOSITION ANALYSIS

Identifikasi service files yang lebih dari 1000 lines.

Untuk setiap service tersebut:

identifikasi fungsi utama
kelompokkan logic menjadi:

command handler
query handler
event handler
repository access

CONTROLLER BOUNDARY ANALYSIS

Cari semua controller yang langsung menggunakan:

prisma
database client

Laporkan:

controller name
file path
query yang dilakukan

EVENT ARCHITECTURE AUDIT

Scan seluruh penggunaan:

emitDomainEvent

Periksa:

event naming consistency
event payload schema
event versioning

Laporkan jika terdapat:

uppercase event names
duplicate events
inconsistent naming

NOTIFICATION DOMAIN ANALYSIS

Audit module notification karena menerima event dari banyak domain.

Identifikasi:

attendance events
payment events
parent-app events

Periksa apakah consumer logic bercampur dalam satu service.

OUTPUT LAPORAN

docs/architecture/DOMAIN_HARDENING_AUDIT.md

FORMAT LAPORAN

1. Circular Dependency Root Cause
2. Service Decomposition Candidates
3. Controller Boundary Violations
4. Event Architecture Issues
5. Notification Domain Refactor Candidates
6. Recommended Refactor Plan
