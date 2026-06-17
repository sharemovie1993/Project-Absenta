Instruksi Implementasi – Dashboard Bootstrap Contract Refactor (Absenta SaaS)

Tujuan instruksi ini adalah merapikan kontrak bootstrap dashboard agar **tenant dashboard hanya memanggil endpoint yang sesuai dengan domain TENANT**, bukan endpoint PLATFORM.

Masalah yang ditemukan setelah RBAC diperketat:

Tenant dashboard masih memanggil endpoint yang dibuat untuk **Platform Console**, seperti:

```
/api/tenants/:id
/api/billing/subscriptions/active
/api/notifications/status
```

Endpoint tersebut membutuhkan capability domain PLATFORM sehingga menyebabkan:

```
403 Forbidden
Admin missing capability
```

Ini bukan bug RBAC, melainkan artefak dari desain awal sistem yang dibangun dengan pola **superadmin-first architecture**.

Refactor ini akan membuat kontrak bootstrap dashboard menjadi **SaaS-safe**.

---

1. Tujuan Refactor

Tenant dashboard harus hanya memanggil endpoint yang:

```
tenant-aware
tenant-isolated
tidak memerlukan platform capability
```

Semua endpoint bootstrap dashboard harus menggunakan:

```
tenant context middleware
```

bukan parameter tenant dari request.

---

2. Audit Bootstrap Dashboard

TRAE (ANDA) diminta memindai seluruh frontend untuk menemukan API yang dipanggil saat dashboard pertama kali load.

Scan folder:

```
src/pages/dashboard
src/layouts
src/hooks
src/services/api
src/stores
```

Cari pola seperti:

```
axios.get(...)
api.get(...)
fetch(...)
Promise.all([...])
```

Khususnya pada:

```
dashboard initialization
app bootstrap
auth initialization
```

Hasil audit harus menghasilkan daftar endpoint bootstrap.

---

3. Klasifikasi Endpoint

Setiap endpoint bootstrap harus diklasifikasikan:

```
TENANT_SAFE
PLATFORM_ONLY
REVIEW_REQUIRED
```

Contoh:

TENANT_SAFE

```
/api/auth/me
/api/system/config
/api/dashboard/overview
/api/attendance/summary
```

PLATFORM_ONLY

```
/api/tenants/:id
/api/billing/subscriptions/active
/api/notifications/status
/api/platform/health
```

Endpoint PLATFORM_ONLY tidak boleh dipanggil oleh tenant dashboard.

---

4. Kontrak Bootstrap Dashboard Baru

Bootstrap dashboard tenant hanya boleh memanggil endpoint berikut:

```
GET /api/auth/me
GET /api/system/config
GET /api/me/tenant
GET /api/me/subscription
GET /api/dashboard/overview
```

Penjelasan:

```
/api/auth/me
mengambil user + role + tenant context

/api/system/config
mengambil konfigurasi sistem tenant

/api/me/tenant
mengambil profil tenant

/api/me/subscription
mengambil subscription tenant

/api/dashboard/overview
mengambil statistik dashboard
```

---

5. Endpoint Pengganti Tenant Context

Jika dashboard sebelumnya memanggil endpoint platform seperti:

```
/api/billing/subscriptions/active
```

maka harus diganti dengan endpoint tenant:

```
/api/me/subscription
```

Endpoint ini harus mengambil data subscription berdasarkan:

```
req.tenant.id
```

---

6. Refactor Frontend Bootstrap

TRAE (ANDA) harus memperbarui bootstrap logic dashboard.

Contoh sebelum refactor:

```
Promise.all([
  api.get("/auth/me"),
  api.get("/billing/subscriptions/active"),
  api.get("/notifications/status"),
  api.get("/dashboard/overview")
])
```

Sesudah refactor:

```
Promise.all([
  api.get("/auth/me"),
  api.get("/system/config"),
  api.get("/me/tenant"),
  api.get("/me/subscription"),
  api.get("/dashboard/overview")
])
```

---

7. Error Handling Bootstrap

Bootstrap dashboard tidak boleh redirect ke halaman 403 jika salah satu API gagal.

Perbaiki logic bootstrap agar:

```
error pada bootstrap endpoint
tidak menghentikan dashboard load
```

Contoh:

```
Promise.allSettled([...])
```

bukan:

```
Promise.all([...])
```

---

8. Verifikasi Endpoint Tenant

Pastikan endpoint berikut menggunakan tenant context middleware:

```
/api/me/tenant
/api/me/subscription
/api/dashboard/overview
```

Tenant ID tidak boleh diambil dari:

```
params
query
body
```

---

9. Laporan Refactor

TRAE (ANDA) harus menghasilkan laporan:

```
DASHBOARD_BOOTSTRAP_CONTRACT_REFACTOR.md
```

Isi laporan:

Daftar endpoint bootstrap sebelum refactor

Daftar endpoint bootstrap setelah refactor

Endpoint platform yang dihapus dari bootstrap

Endpoint tenant baru yang digunakan

---

10. Verifikasi Sistem

Setelah refactor selesai lakukan pengujian:

```
login sebagai ADMIN
login sebagai GURU
login sebagai SISWA
```

Pastikan:

```
dashboard load tanpa 403
tidak ada bootstrap API yang gagal karena capability
```

Jalankan juga:

```
npm run build
npm run test
```

---

11. Tujuan Akhir Refactor

Setelah refactor ini selesai:

Tenant dashboard hanya menggunakan endpoint domain TENANT.

Tidak ada lagi kasus:

```
tenant memanggil endpoint platform
```

Hal ini memastikan:

```
clean separation antara PLATFORM console dan TENANT application
```

yang merupakan prinsip dasar arsitektur SaaS.
