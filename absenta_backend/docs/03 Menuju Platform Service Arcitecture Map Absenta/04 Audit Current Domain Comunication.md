TRAE,

Blueprint “ABSENTA PLATFORM REFACTOR BLUEPRINT” sudah dipahami.

Langkah berikutnya adalah melakukan audit untuk memetakan sistem saat ini terhadap blueprint tersebut.

Audit ini disebut:

BLUEPRINT IMPLEMENTATION GAP ANALYSIS

Tujuan audit ini adalah mengetahui:

* bagaimana komunikasi antar domain terjadi saat ini
* bagaimana komunikasi tersebut akan diubah menjadi event driven architecture
* bagaimana queue dan worker akan dipetakan

Tidak ada refactor pada tahap ini.

---

# 1. Audit Current Domain Communication

Tujuan:

mengidentifikasi semua komunikasi antar domain yang terjadi saat ini.

Langkah:

periksa seluruh service modules.

Cari kasus:

* attendance memanggil notification service
* attendance memanggil parent-app service
* billing memanggil invoice service
* parent-app memanggil attendance service

Laporkan:

CURRENT DOMAIN COMMUNICATION MAP

caller_domain
target_domain
method_called
file_location

---

# 2. Mapping Domain Communication to Events

Untuk setiap direct service call yang ditemukan, buat mapping event.

Contoh:

current:

attendance service → notification service

target:

attendance.tap event

consumer:

notification worker
parent-app worker

Laporkan dalam format:

EVENT TRANSFORMATION MAP

current_call
target_event
producer_domain
consumer_services

---

# 3. Audit Current Queue Usage

Identifikasi semua queue yang saat ini digunakan.

Laporkan:

QUEUE INVENTORY

queue_name
producer_module
worker_consumer
job_type
file_location

---

# 4. Audit Worker Deployment Model

Identifikasi bagaimana worker dijalankan saat ini.

Laporkan:

WORKER MODEL

worker_name
queue
concurrency
deployment_mode

Contoh deployment mode:

embedded worker (dalam API)
separate worker process

---

# 5. Audit Event Bus Integration

Periksa penggunaan event bus.

Laporkan:

EVENT BUS MAP

event_name
producer
consumer
transport (redis pub/sub, queue, event emitter)

---

# 6. Output Audit

Output audit harus menghasilkan dokumen berikut:

1. Current Domain Communication Map
2. Event Transformation Map
3. Queue Inventory
4. Worker Deployment Model
5. Event Bus Map

Tujuan audit ini adalah menyiapkan implementasi:

ABSENTA EVENT DRIVEN ARCHITECTURE

Tidak ada perubahan kode pada tahap ini.
