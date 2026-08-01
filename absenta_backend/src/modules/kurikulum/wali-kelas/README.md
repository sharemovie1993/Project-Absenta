# Modul Wali Kelas (`/kurikulum/wali-kelas`)

Modul ini berfungsi sebagai **Proxy / Proyeksi Khusus** dari tabel utama `OrganizationalAssignment` untuk posisi dengan kode `WALIKELAS`. Modul ini mengelola penugasan Wali Kelas per rombel/kelas, paginasi daftar wali kelas, serta pencetakan Surat Keputusan (SK) Wali Kelas.

---

## 🏛️ Arsitektur Single Source of Truth & Redis Caching

### 🔗 Arsitektur Proxy Proyeksi
Setiap penugasan Wali Kelas yang dicatat melalui `/kurikulum/wali-kelas` terhubung langsung dengan `OrganizationalAssignment`. Hal ini menjamin konsistensi data antara diagram visual di `/academic/struktur-organisasi` dan tabel di `/kurikulum/wali-kelas`.

### 🔑 Kunci Cache Redis (TTL 5 Menit)
- **Daftar Penugasan Wali Kelas**: `academic:{tenantId}:wali_kelas:{page}:{limit}:{search}:{includeInactive}`

---

## 🔔 Sinyal Auto-Invalidation Real-Time

Ketika penugasan Wali Kelas diperbarui (`assignStrukturWaliKelas` atau `nonaktifStrukturAssignment`), service memanggil:
```typescript
await cacheInvalidationService.invalidateStrukturTree(tenantId);
```
Perubahan langsung ter-update secara *real-time* di seluruh sistem Absenta (Pohon Organisasi, Rekap Presensi Kelas, dan Ekuivalensi JP Guru).

---

## ⚡ Hasil Benchmark Kecepatan
- **Cache MISS (Database Query & Pagination)**: ~7.76 ms
- **Cache HIT (Direct Redis Response)**: ~1.91 ms (4.1x lebih cepat)
- **Script Uji Invalidation**: `test-struktur-cache-invalidation.ts` (PASSED)
