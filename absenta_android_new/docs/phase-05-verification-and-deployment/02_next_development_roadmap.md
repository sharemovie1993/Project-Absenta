# Fase 5.2: Roadmap & Petunjuk Pengembangan Masa Depan

Dokumen ini berisi panduan bagi pengembang yang akan melanjutkan atau memperluas fitur aplikasi `absenta_android_new`:

---

## 📌 Checklist Pengembangan Lanjutan

### 1. Uji Coba Lapangan Real Backend
- Pastikan server `absenta_backend` aktif di jaringan lokal (e.g. `http://192.168.1.100:3000`).
- Saat aplikasi dibuka di HP, pengguna dapat menyeleksi atau mengubah Base URL jika IP server berubah.

### 2. Penambahan Modul Baru
Jika di masa depan backend menambahkan capability baru di `position-capabilities.ts` (misalnya `perpus.pinjam.buku`):
1. Tambahkan endpoint Retrofit baru di `data/api/`.
2. Tambahkan data model di `data/model/Models.kt`.
3. Tambahkan rute di `ScreenRoutes.kt` dan masukkan ke `CAPABILITY_ROUTE_MAP`.
4. Tambahkan kartu menu di `buildMenuCards()` pada `DynamicMenuDashboard.kt`.
5. Buat screen baru di `ui/features/`.

### 3. Build Production (Release APK / AAB)
Untuk mempublikasikan ke Google Play Store atau distribusi internal:
1. Buat Keystore tandatangan (JKS): `keytool -genkey -v -keystore release.jks ...`
2. Konfigurasi `signingConfigs` di `app/build.gradle.kts`.
3. Jalankan build release:
   ```bash
   ./gradlew assembleRelease
   ```
