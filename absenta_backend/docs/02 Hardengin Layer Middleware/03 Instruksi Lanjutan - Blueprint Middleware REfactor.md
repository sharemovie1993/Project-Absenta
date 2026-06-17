Instruksi Lanjutan – Blueprint Middleware Refactor

Tujuan tahap ini bukan melakukan refactor, tetapi melakukan mapping antara blueprint middleware yang telah dibuat dengan implementasi sistem saat ini.

Langkah yang harus dilakukan:

1. Buat tabel mapping antara middleware eksisting dan middleware target pada blueprint.

Contoh format:

Middleware Saat Ini
auth.ts

Middleware Target
AuthMiddleware

Status
sudah sesuai

---

Middleware Saat Ini
tenant.ts

Middleware Target
TenantResolverMiddleware + TenantStatusMiddleware

Status
perlu dipisah

---

2. Identifikasi middleware yang duplikat.

Cari middleware yang dipasang pada:

global level
/api group
module route

Laporkan middleware mana yang muncul lebih dari satu kali dalam pipeline request.

---

3. Identifikasi middleware yang sebenarnya memiliki tanggung jawab ganda.

Contoh kemungkinan:

tenant.ts kemungkinan berisi:

tenant resolver
tenant status validation
subscription guard

Jika benar, tandai bahwa middleware tersebut perlu dipisah menjadi beberapa middleware kecil.

---

4. Identifikasi endpoint yang menggunakan whitelist prefix bypass.

Cari kode seperti:

startsWith("/payment")
startsWith("/invoice")
startsWith("/documents")

Laporkan semua prefix bypass tersebut.

---

5. Audit route config readiness.

Periksa apakah route saat ini sudah memiliki config metadata seperti:

config.capability
config.skipAuth

Jika belum, identifikasi module mana yang belum memiliki metadata tersebut.

---

6. Buat daftar endpoint yang saat ini tidak memiliki permission guard.

Endpoint yang hanya menggunakan:

AuthMiddleware

atau

Auth + Tenant

harus dicatat.

---

7. Buat diagram pipeline middleware aktual setelah mapping.

Contoh:

Request
→ AuthMiddleware
→ TenantMiddleware
→ CapabilityGuard
→ RequireCapability
→ Controller

Bandingkan pipeline ini dengan pipeline blueprint.

---

8. Buat Gap Table.

Kolom:

Layer Blueprint
Middleware Saat Ini
Status
Catatan

Contoh:

Auth Layer
AuthMiddleware
OK

Tenant Resolver
TenantMiddleware
Perlu dipisah

Core Subscription
SubscriptionGuard
OK

Service Capability
CapabilityGuard
OK

Permission
RequireCapability
OK

Data Scope
DetermineDataScope
OK

---

Output yang diharapkan dari tahap ini adalah:

1 laporan mapping middleware
1 tabel gap analysis
1 diagram pipeline aktual

Tidak ada refactor kode pada tahap ini.
