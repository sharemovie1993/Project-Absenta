Instruksi Implementasi – Endpoint Context Separation Audit

Tujuan audit ini adalah memastikan endpoint yang digunakan oleh tenant application tidak menggunakan capability domain PLATFORM.

Langkah audit yang harus dilakukan oleh TRAE (ANDA):

1. Scan seluruh endpoint backend yang menggunakan requireCapability.

2. Identifikasi endpoint yang menggunakan capability domain PLATFORM.

3. Bandingkan endpoint tersebut dengan menu TENANT.

Jika endpoint domain PLATFORM dipanggil oleh tenant application maka endpoint tersebut dikategorikan sebagai:

```
PLATFORM LEAK
```

4. Endpoint yang termasuk kategori PLATFORM LEAK harus diklasifikasikan sebagai:

```
Frontend misuse
Endpoint misclassification
Missing tenant endpoint
```

5. Hasil audit harus menghasilkan laporan:

```
ENDPOINT_CONTEXT_SEPARATION_AUDIT.md
```

Isi laporan:

Daftar endpoint domain PLATFORM

```
GET /tenants
GET /tenants/{id}
GET /billing/plans
GET /billing/subscriptions
```

Endpoint yang dipanggil tenant application

Endpoint yang harus diganti oleh endpoint tenant context.

6. Jika tenant membutuhkan data tenant sendiri maka endpoint baru harus dibuat:

```
GET /me/tenant
```

dengan capability:

```
core.sekolah.view.profile
```

Endpoint ini menggantikan akses tenant ke:

```
/tenants/{id}
```

7. Setelah refactor selesai lakukan verifikasi:

```
npm run build
npm run test
```

Pastikan tidak ada lagi tenant user yang mencoba mengakses endpoint platform.
