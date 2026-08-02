# 📱 Dokumentasi Arsitektur Portal App Launcher (5 Blok) & URL-Driven Context Engine

## 📌 Pendahuluan
Dokumen ini menyajikan arsitektur lengkap **Portal App Launcher (Grid Smartphone Mode)** dan mekanisme **URL-Driven Context Engine** pada frontend **Project Absenta**.

Arsitektur ini dirancang khusus untuk menangani skenario pengguna **Double Jabatan (Multi-Role)** seperti **Wakasek Kurikulum yang juga menjabat sebagai Wali Kelas**, secara aman dan 100% independen dari status workspace aktif (`activeWorkspaceId`).

---

## 📱 1. Struktur 5 Blok Terpisah pada App Launcher (`StaffPortalAppLauncher.tsx`)

Tampilan grid smartphone mode dibagi ke dalam 5 blok fungsional yang sangat terstruktur:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📱 BANNER LAUNCHER (Halo, Kusnadi! • KURIKULUM & WALI KELAS XII RPL 1)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚡ 1. AKSI CEPAT DIRI (Quick Actions Dinamis)                                │
│ [Presensi Diri] [Catat Pelanggaran] [Jurnal KBM] ...                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🏛️ 2. RUANG KERJA : KURIKULUM (Pimpinan Struktural Utama)                    │
│ [Struktur Kurikulum] [Jadwal KBM] [Perangkat Ajar] [Pelanggaran Sekolah]...  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🏫 3. RUANG KERJA JABATAN KEDUA : WALI KELAS XII RPL 1 (Slot Double Jabatan) │
│ [Belum Hadir] [Pelanggaran Rombel] [Monitoring KBM Rombel] ...              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✨ 4. OPERASIONAL PENGAJARAN GURU (Universal Operasional KBM)               │
│ [Absensi Kelas] [Rekap Absensi] [Input Nilai] [Jurnal KBM] [Perangkat Ajar]..│
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔗 5. INFORMASI LINTAS MODUL (Layanan Ekosistem Lintas Unit Kerja)           │
│ [Peminjaman Sarpras] [Monitoring PKL] [Layanan Koperasi] ...                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rincian Perilaku Blok:
1. **BLOK 1 (`1. AKSI CEPAT DIRI`)**: Pintasan aksi cepat pengguna (seperti presensi diri dan jurnal KBM).
2. **BLOK 2 (`2. RUANG KERJA : [JABATAN PIMPINAN UTAMA]`)**: Menggunakan hirarki `PIMPINAN_PRIORITY` (`KURIKULUM` > `KESISWAAN` > `KEPSEK` > `SARPRAS` > `HUBIN` > `KAPROG` > `KABENG`). Blok ini selalu diduduki oleh jabatan pimpinan/struktural utama.
3. **BLOK 3 (`3. RUANG KERJA JABATAN KEDUA : [JABATAN KEDUA]`)**: Slot khusus jika pengguna memiliki **Double Jabatan** (misal: Wali Kelas). Menampilkan menu spesifik tugas pembinaan rombel seperti *Belum Hadir* (`/attendance/ops?tab=manual`) dan *Pelanggaran Rombel* (`/kesiswaan/pelanggaran?context=walikelas`). *Otomatis tersembunyi jika user hanya memiliki 1 jabatan.*
4. **BLOK 4 (`4. OPERASIONAL PENGAJARAN GURU`)**: Menu operasional pengajaran universal milik seluruh guru.
5. **BLOK 5 (`5. INFORMASI LINTAS MODUL`)**: Menu layanan lintas unit kerja & ekosistem sekolah.

---

## 🌐 2. URL-Driven Context Engine (Independensi dari Workspace State)

Untuk mencegah kebocoran konteks saat aplikasi dioperasikan 100% pada mode App Launcher (tanpa `activeWorkspaceId`), seluruh halaman sensitif dipandu oleh **URL Query Parameters (`?context=...`, `?tab=...`, `?mode=...`)**:

| Halaman Target | URL Query Parameter | Mode Penyajian Data |
| :--- | :--- | :--- |
| **`/kesiswaan/pelanggaran`** | `?context=walikelas` | 🟢 **Terfilter 100% Rombel Binaan** (misal: *X AKL 1*). |
| **`/kesiswaan/pelanggaran`** | `?context=kesiswaan` | 🔵 **Tenant-Wide / School-Wide** (Seluruh sekolah). |
| **`/attendance/ops`** | `?tab=manual` | 🟢 **Tab Cek Manual Wali Kelas / Belum Hadir**. |
| **`/attendance/ops`** | `?tab=sesi` | 🔵 **Tab Manajemen Sesi KBM / Absensi Kelas**. |
| **`/sarpras/loans`** | `?mode=personal` | 🟢 **Pinjaman Saya / Mode Guru Personal**. |
| **`/sarpras/loans`** | `?mode=kurikulum` | 🔵 **Inventaris KBM & Pembelajaran Sekolah**. |

---

## 🎛️ 3. In-Page Context Switcher Pill (`PelanggaranPage.tsx`)

Apabila pengguna memiliki **Double Jabatan** (misal: Wali Kelas + Wakasek Kurikulum), halaman `/kesiswaan/pelanggaran` menyediakan **Context Switcher Pill** langsung di kanan atas toolbar:

```tsx
{isDualRoleUser && (
  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
    <button
      onClick={() => handleContextSwitch('walikelas')}
      className={isWaliKelas ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}
    >
      🟢 Rombel {waliKelasNama}
    </button>
    <button
      onClick={() => handleContextSwitch('kesiswaan')}
      className={!isWaliKelas ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}
    >
      🔵 Seluruh Sekolah
    </button>
  </div>
)}
```

- **Fitur ini memungkinkan pengguna berpindah dari mode Rombel Binaan ke Seluruh Sekolah (dan sebaliknya) dalam 1 klik tanpa harus keluar dari halaman.**

---

## 🔄 4. Full-Stack Cache Invalidation (React Query + Backend Redis)

Setiap aksi penambahan, edit, atau hapus data pada frontend memicu invalidasi cache dua arah:
1. **Frontend**: `queryClient.invalidateQueries({ queryKey: [...] })` mematikan cache React Query di browser.
2. **Backend**: `cacheInvalidationService.invalidatePelanggaranCache(tenantId, siswaId)` membersihkan kunci Redis `kesiswaan:pelanggaran:{tenantId}:*` & `bpbk:{tenantId}:ews:{siswaId}*`.

---

## 🚀 Status Verifikasi
- **Frontend TypeScript Check**: `npx tsc --noEmit` ➔ **0 Error (PASS)**.
- **Git Commits**: `451b8f32`, `16e32d4c`, `241e0a55`, `3c44913e`.
