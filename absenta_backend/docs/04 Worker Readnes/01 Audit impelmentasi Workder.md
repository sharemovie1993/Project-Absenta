INSTRUKSI AUDIT PLATFORM SCALABILITY
Absenta Platform

Tujuan audit ini adalah mengetahui kondisi aktual platform terkait tiga aspek penting:

Worker Autoscale

Queue Partition

Infrastructure Multi-Node Readiness

Audit ini dilakukan karena sistem sudah berjalan di production, sehingga fokus audit adalah menganalisis kondisi yang ada saat ini, bukan melakukan refactor atau perubahan kode.

TRAE diminta melakukan audit dengan membaca kode, konfigurasi, dan kondisi runtime sistem.

Tidak diperbolehkan melakukan perubahan kode selama audit.

KONTEKS PLATFORM

Platform Absenta menggunakan arsitektur:

Event Driven Modular Monolith

Komponen utama platform:

API Server
Domain Modules
Event Bus
Redis
BullMQ Queue
Workers
Scheduler

Platform sudah menggunakan:

Domain Event
Queue Processing
Retry Mechanism
Idempotency
Dead Letter Queue

Audit ini bertujuan mengetahui apakah platform sudah siap untuk scaling lebih lanjut.

AUDIT WORKER AUTOSCALE

Tujuan audit:

Mengetahui apakah worker saat ini bersifat statis, manual scaling, atau sudah siap autoscale.

Hal yang harus diperiksa:

Worker Deployment

Identifikasi bagaimana worker dijalankan saat ini.

Periksa apakah worker dijalankan menggunakan:

docker-compose
pm2
node process
systemd
kubernetes
atau mekanisme lainnya

Catat:

jumlah worker instance
apakah worker dijalankan hanya satu instance
apakah worker dapat dijalankan lebih dari satu instance secara aman

Tujuan audit ini adalah mengetahui apakah worker architecture mendukung horizontal scaling.

Worker Concurrency

Periksa konfigurasi BullMQ Worker pada seluruh worker yang ada.

Cari konfigurasi concurrency pada setiap worker.

Catat untuk setiap worker:

nama worker
nama queue yang diproses
nilai concurrency

Contoh informasi yang harus dikumpulkan:

worker attendance
concurrency = ?

worker notification
concurrency = ?

worker billing
concurrency = ?

Tujuan audit ini adalah mengetahui kapasitas paralel processing setiap worker.

Worker Resource Usage

Audit penggunaan resource worker saat sistem berjalan.

Kumpulkan informasi berikut jika memungkinkan:

CPU usage worker
RAM usage worker
job processing rate
job latency

Tujuan audit ini adalah mengetahui apakah worker menjadi bottleneck saat load meningkat.

Worker Horizontal Scaling Capability

Audit apakah worker bisa dijalankan dalam lebih dari satu instance.

Pertanyaan yang harus dijawab:

Apakah worker aman dijalankan dalam dua atau lebih container?
Apakah BullMQ queue akan tetap memproses job dengan benar jika worker ditambah?
Apakah sistem idempotency sudah menjamin tidak terjadi duplicate processing?

Output audit harus menjelaskan apakah worker siap untuk horizontal scaling.

AUDIT QUEUE ARCHITECTURE DAN QUEUE PARTITION

Tujuan audit:

Mengetahui bagaimana struktur queue saat ini dan apakah queue siap menangani high load.

Daftar Queue

Scan seluruh kode untuk menemukan semua queue BullMQ yang digunakan.

Cari semua instansiasi queue.

Buat daftar seluruh queue yang ada di platform.

Contoh hasil yang diharapkan:

attendance_queue
notification_queue
billing_queue
email_queue
document_queue

Queue Volume

Audit volume job yang masuk ke setiap queue.

Jika memungkinkan, kumpulkan informasi seperti:

jumlah job per jam
jumlah job waiting
jumlah job delayed
jumlah job failed

Tujuan audit ini adalah mengetahui queue mana yang paling berat.

Queue Bottleneck

Periksa apakah terdapat queue yang sering mengalami kondisi berikut:

waiting job tinggi
delay job tinggi
failed job tinggi

Jika ada queue yang menjadi bottleneck, sebutkan queue tersebut.

Queue Partition Strategy

Audit apakah queue saat ini menggunakan strategi berikut:

single queue untuk seluruh sistem
queue per domain
queue per tenant
queue partition

Catat struktur queue yang digunakan saat ini.

Contoh kemungkinan hasil:

attendance menggunakan satu queue global

atau

attendance menggunakan queue terpisah per domain

Tujuan audit ini adalah mengetahui apakah queue architecture siap untuk scaling.

AUDIT INFRASTRUCTURE MULTI NODE READINESS

Tujuan audit:

Mengetahui apakah platform dapat dijalankan di lebih dari satu server.

Redis Configuration

Audit deployment Redis yang digunakan platform.

Periksa apakah Redis berjalan dalam mode:

single instance
redis sentinel
redis cluster

Catat juga:

host redis
apakah redis memiliki persistence
apakah redis memiliki high availability setup

API Server Stateless

Audit apakah API server bersifat stateless.

Periksa apakah API menyimpan state pada:

memory server
local session
file system

Jika API menyimpan state di memory server, maka sistem belum siap multi-node.

Jika state disimpan di:

database
redis
external storage

maka API sudah stateless.

File Storage

Audit bagaimana file disimpan di platform.

Periksa apakah file disimpan di:

local disk server
shared storage
object storage

Jika file disimpan di local disk server, maka platform belum siap multi-node.

Scheduler System

Audit scheduler yang digunakan platform.

Periksa apakah scheduler menggunakan:

cron job
bull repeatable jobs
custom scheduler

Periksa apakah scheduler aman dijalankan di multi-node.

Pastikan scheduler tidak menyebabkan duplicate job execution jika dijalankan di lebih dari satu instance.

AUDIT EVENT BUS STABILITY

Audit event bus yang menggunakan Redis Pub/Sub.

Periksa:

jumlah event yang dipublish
jumlah subscriber
kemungkinan event drop
error rate event bus

Tujuan audit ini adalah memastikan event bus tetap stabil jika platform dijalankan di multi-node.

FORMAT LAPORAN YANG DIMINTA

TRAE harus menghasilkan laporan audit dengan struktur berikut:

Platform Infrastructure Audit

Worker Architecture
daftar worker
concurrency
scaling capability

Queue Architecture
daftar queue
job volume
bottleneck queue

Infrastructure
redis configuration
api stateless status
file storage
scheduler safety

Multi Node Readiness
ready / partial / not ready

CATATAN PENTING

Audit ini hanya bertujuan untuk mengetahui kondisi platform saat ini.

Tidak diperbolehkan:

mengubah kode
menambahkan fitur
mengubah konfigurasi sistem

Audit hanya melakukan:

membaca kode
memeriksa konfigurasi
mengumpulkan informasi runtime
menganalisis arsitektur

Tujuan akhir audit ini adalah menjawab tiga pertanyaan utama:

Apakah worker siap autoscale
Apakah queue siap menangani high load
Apakah platform siap dijalankan pada multi-node infrastructure