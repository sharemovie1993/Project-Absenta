Instruksi Implementasi – PLAN ARCHITECTURE AUDIT (SaaS Multi-Service Readiness)

Platform Absenta sedang memasuki tahap penataan Subscription Lifecycle dan Billing Architecture.
Sebelum mengimplementasikan downgrade flow dan monetization lifecycle secara penuh, kita harus memastikan bahwa model Plan saat ini sudah sesuai dengan arsitektur SaaS platform multi-service.

Audit ini tidak melakukan perubahan kode.
Tujuannya adalah memetakan implementasi Plan Management yang ada saat ini dan menilai apakah arsitekturnya sudah siap untuk mendukung model SaaS platform yang modular.

Output audit akan menjadi dasar untuk refactor Plan Architecture dan implementasi lifecycle subscription yang ideal.

1. Tujuan Audit

Audit ini bertujuan untuk menjawab beberapa pertanyaan utama:

* Bagaimana struktur tabel Plan saat ini
* Apa saja plan yang ada di sistem
* Bagaimana relasi Plan dengan Subscription
* Bagaimana Plan menentukan akses fitur atau service
* Bagaimana Plan terhubung dengan Billing dan Invoice
* Apakah model Plan saat ini sudah mendukung SaaS multi-service platform

Platform Absenta dirancang sebagai platform yang dapat memiliki beberapa layanan (service) di atas core platform, misalnya:

Core Platform
Attendance Service
Analytics Service
Notification Service
AI Monitoring Service

Model SaaS yang ideal memungkinkan satu tenant memiliki beberapa subscription untuk layanan yang berbeda.

Tenant
├ Attendance subscription
├ Analytics subscription
└ Notification subscription

Audit ini bertujuan memastikan apakah model plan saat ini sudah mendukung arsitektur tersebut atau masih berbentuk single-product SaaS.

2. Analisis Struktur Table Plan

TRAE diminta menganalisis struktur tabel Plan yang ada di database.

Jelaskan:

* Nama tabel
* Field yang tersedia
* Constraint yang digunakan
* Relasi foreign key yang ada

Contoh field yang mungkin ada:

id
code
name
price
billing_cycle
status
metadata

Jika ada field tambahan seperti:

service_type
feature_limit
quota

mohon dijelaskan fungsi field tersebut.

Kemudian jelaskan apakah tabel Plan saat ini mewakili:

* product plan
* service plan
* bundle plan
* global platform plan

3. Daftar Plan Yang Saat Ini Ada

TRAE diminta menampilkan daftar plan yang saat ini ada di database.

Gunakan query atau metode lain yang sesuai.

Contoh query:

SELECT id, code, name, price, billing_cycle, status
FROM Plan;

Kemudian jelaskan setiap plan yang ditemukan.

Untuk setiap plan jelaskan:

* fungsi plan
* apakah plan mandatory
* apakah plan dapat diupgrade
* apakah plan dapat didowngrade
* apakah plan hanya digunakan untuk bootstrap tenant

Perhatikan khusus apakah ada plan seperti:

CORE_PLATFORM

Jika ada, jelaskan fungsi plan tersebut dalam arsitektur platform.

4. Relasi Plan Dengan Subscription

TRAE diminta menjelaskan hubungan antara tabel Subscription dan Plan.

Diagram relasi yang harus dijelaskan:

Tenant
↓
Subscription
↓
Plan

Kemudian jawab pertanyaan berikut:

Apakah satu tenant hanya dapat memiliki satu subscription aktif?

atau

Apakah tenant dapat memiliki beberapa subscription sekaligus untuk layanan yang berbeda?

Contoh multi-service subscription:

Tenant
├ Attendance subscription
├ Analytics subscription
└ Notification subscription

Jika sistem saat ini hanya mendukung satu subscription per tenant, jelaskan bagaimana constraint tersebut diterapkan.

5. Relasi Plan Dengan Feature / Capability

TRAE diminta menjelaskan bagaimana Plan menentukan fitur yang tersedia untuk tenant.

Periksa apakah ada tabel seperti:

PlanFeature
PlanCapability
PlanModule
PlanService

Jika ada, jelaskan relasinya.

Contoh relasi yang ideal:

Plan
↓
PlanFeature
↓
Feature

Jika tidak ada relasi tersebut, jelaskan bagaimana sistem saat ini menentukan fitur yang aktif untuk tenant berdasarkan plan.

Apakah fitur dikontrol oleh:

* capability
* feature flag
* hardcoded logic
* atau konfigurasi lain

6. Cara Plan Diekspos ke Frontend

TRAE diminta menjelaskan endpoint API yang digunakan untuk menampilkan plan ke frontend.

Misalnya:

GET /api/plans

atau endpoint lain yang digunakan dalam upgrade wizard.

Jelaskan:

* endpoint yang digunakan
* controller yang menangani
* service yang mengambil data plan
* data apa saja yang dikirim ke frontend

Periksa juga apakah plan difilter berdasarkan tenant context.

7. Relasi Plan Dengan Billing

TRAE diminta menjelaskan hubungan antara:

Plan
Billing
Invoice

Diagram relasi yang harus dijelaskan:

Subscription
↓
Plan
↓
Billing
↓
Invoice

Kemudian jelaskan:

Apakah harga billing selalu berasal dari Plan.price

atau

Apakah billing dihitung berdasarkan kombinasi:

Plan + quantity + addon

8. Apakah Add-On Service Sudah Didukung

Dalam SaaS modern biasanya terdapat model:

Base Plan
+
Add-On Service

Contoh:

Attendance Plan

* SMS Notification Add-On
* AI Face Recognition Add-On

TRAE diminta memeriksa apakah sistem saat ini sudah memiliki konsep add-on service.

Periksa apakah ada tabel seperti:

Addon
PlanAddon
SubscriptionAddon

Jika tidak ada, jelaskan bagaimana sistem saat ini menangani fitur tambahan di luar plan utama.

9. Diagram Arsitektur Plan Yang Saat Ini Digunakan

TRAE diminta membuat diagram arsitektur plan berdasarkan implementasi yang ditemukan.

Minimal diagram harus mencakup:

Tenant
Subscription
Plan
Billing
Invoice
Payment

Diagram harus menunjukkan bagaimana plan mempengaruhi subscription lifecycle.

10. Analisis Multi-Service Readiness

Di bagian akhir laporan, TRAE diminta menjawab secara eksplisit:

Apakah model plan saat ini sudah mendukung SaaS multi-service platform?

atau

Apakah model plan masih berbentuk single-product SaaS?

Jika masih single-product SaaS, jelaskan:

* keterbatasan model saat ini
* perubahan arsitektur yang diperlukan untuk mendukung multi-service SaaS

11. Output Laporan

TRAE diminta membuat dokumen laporan audit dengan nama:

PLAN_MODEL_AUDIT.md

Isi laporan harus mencakup:

1. Struktur tabel Plan
2. Daftar plan yang ada di sistem
3. Relasi Plan dengan Subscription
4. Relasi Plan dengan Feature atau Capability
5. Endpoint API untuk plan
6. Relasi Plan dengan Billing dan Invoice
7. Analisis dukungan Add-On service
8. Diagram arsitektur plan
9. Analisis kesiapan multi-service SaaS

Audit ini hanya melakukan analisis implementasi saat ini dan tidak melakukan perubahan kode.
