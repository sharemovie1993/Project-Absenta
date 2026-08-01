# Modul Guru Mapel (Pemetaan Pengampu & Beban Mengajar)

Modul ini mengelola penugasan guru ke mata pelajaran (`GuruMapel`), cakupan plotting (Global, Jurusan, atau Rombel/Kelas), ekuivalensi beban jabatan struktural, serta perhitungan alokasi jam pelajaran (JP).

---

## 🏛️ Arsitektur Multi-Tenant Redis Caching

Untuk menghindari perulangan linier saat memuat tabel pengampu dan indikator progress bar beban mengajar guru (24 JP max), modul ini memuat data beban mengajar via **Redis Multi-Tenant Caching** (TTL: 5 menit).

### 🔑 Struktur Key Cache Redis
- **Beban Mengajar Guru**: `academic:{tenantId}:beban_guru:{yearId}:{semId}`

---

## 🔔 Sinyal Auto-Invalidation Real-Time

Setiap kali ada penugasan guru mapel baru dibuat, diperbarui cakupannya, atau dihapus, controller/service memanggil:
```typescript
await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
```
Metode ini secara otomatis menghapus key `academic:{tenantId}:beban_guru:*` di Redis sehingga progress beban JP guru di UI selalu akurat.

---

## ⚡ Hasil Benchmark Kecepatan
- **Cache MISS (Database Calculation)**: ~12.8 ms
- **Cache HIT (Direct Redis Response)**: ~0.06 ms (**213.2x lebih cepat**)
- **Script Uji Invalidation**: `test-cache-invalidation.ts` (PASSED)
