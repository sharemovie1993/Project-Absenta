# Fase 2.2: UI Design System (`Dark-First`) & Shared Components

## 🎨 Palet Warna Utama (`Color.kt`)

Sistem warna menggunakan filosofi **Dark-First** dengan kontras tinggi untuk visibilitas layar di ruang terbuka (lapangan/gerbang sekolah):

| Token Warna | Hex Code | Penggunaan Utama |
|:---|:---|:---|
| `BackgroundDark` | `#0F172A` (Slate-950) | Latar belakang seluruh halaman |
| `SurfaceDark` | `#1E293B` (Slate-800) | Latar belakang Card, Modal, & Dialog |
| `SurfaceVariantDark` | `#334155` (Slate-700) | Latar belakang Input Field & Chip |
| `Primary` | `#3B82F6` (Blue-500) | Warna tombol utama, tab aktif, & aksen |
| `StatusHadir` / `Success` | `#10B981` (Emerald-500) | Badge & KPI status Hadir |
| `StatusIzin` | `#3B82F6` (Blue-500) | Badge status Izin |
| `StatusSakit` / `Warning` | `#F59E0B` (Amber-500) | Badge status Sakit & Anomali Warning |
| `StatusAlpa` / `Danger` | `#EF4444` (Red-500) | Badge status Alpa & Anomali Error |

---

## 🔤 Tipografi & Skala (`Type.kt`)

Menggunakan font Roboto bawaan Android dengan pembobotan **`FontWeight.Bold`** pada data numerik & KPI agar mudah dipindai cepat dalam hitungan detik.

---

## 🧱 7 Shared DRY Components (`com.absenta.app.ui.components`)

1. **`AbsentaTopBar`**: Header universal dengan judul bold & tombol kembali.
2. **`KpiCard`**: Kartu KPI berukuran besar dengan latar gradient halus & ikon aksen.
3. **`AnomalyAlertCard`**: Kartu peringatan otomatis untuk Kepsek (sesi belum dibuka / lonjakan alpa).
4. **`StatusBadge`**: Badge berukuran ringkas untuk menandai status HADIR / IZIN / SAKIT / ALPA.
5. **`LoadingOverlay`**: Progress indicator melingkar di tengah layar.
6. **`EmptyState`**: Tampilan visual khusus saat data dari API bernilai kosong.
7. **`ErrorState`**: Tampilan visual gangguan koneksi lengkap dengan tombol "Coba Lagi".
