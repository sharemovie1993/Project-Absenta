# Modul Struktur Organisasi (`/academic/struktur-organisasi`)

Modul ini bertanggung jawab untuk mengelola hirarki struktur organisasi sekolah, penugasan jabatan guru & siswa (Pimpinan, TU, Kaprog, Kabeng, Toolman, Wali Kelas, Pembina Eskul, BP/BK, Gerbang, Petugas Kelas, Koperasi), serta visualisasi diagram pohon hirarki (**Topology Tree**).

---

## 🏛️ Arsitektur Multi-Tenant Redis Caching & Indexing

### 📌 Database Composite Indexing
Tabel `OrganizationalAssignment` dilengkapi dengan composite index majemuk:
```prisma
@@index([tenant_id, is_active])
@@index([tenant_id, position_id, is_active])
@@index([tenant_id, kelas_id, is_active])
```

### 🔑 Kunci Cache Redis (TTL 5 Menit)
- **Pohon Hirarki Struktur Organisasi**: `academic:{tenantId}:struktur_tree`

---

## 🔔 Sinyal Auto-Invalidation Real-Time

Setiap kali terjadi penugasan jabatan baru (`assignGuru`, `assignSiswa`), penonaktifan penugasan (`removeGuru`, `removeSiswa`), atau manipulasi master struktur (`create`, `update`, `delete`), service memanggil:
```typescript
await cacheInvalidationService.invalidateStrukturTree(tenantId);
```
Metode ini secara serentak menghapus:
1. `academic:{tenantId}:struktur_tree` (Visual Tree Diagram)
2. `academic:{tenantId}:wali_kelas:*` (Proxy Halaman Wali Kelas)
3. `academic:{tenantId}:beban_guru:*` (Auto Sync Ekuivalensi JP Mengajar Guru)
4. `academic:{tenantId}:rekap:*` (Auto Sync Wewenang Wali Kelas pada Rekap Absensi)

---

## ⚡ Hasil Benchmark Kecepatan
- **Cache MISS (Database Query & Tree Construction)**: ~53.35 ms
- **Cache HIT (Direct Redis Response)**: ~0.06 ms (**832.3x lebih cepat**)
- **Script Uji Invalidation**: `test-struktur-cache-invalidation.ts` (PASSED)
