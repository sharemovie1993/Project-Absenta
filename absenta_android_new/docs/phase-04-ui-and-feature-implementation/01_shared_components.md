# Fase 4.1: Shared UI Components Documentation

## 🧱 7 Shared DRY UI Components (`com.absenta.app.ui.components`)

### 1. `AbsentaTopBar.kt`
Top App Bar standar dengan warna Dark-First (`BackgroundDark`), judul bold, dan tombol back yang konsisten di semua layar.

### 2. `KpiCard.kt`
Card statistik KPI dengan gradien halus di latar belakang, ikon warna aksen, nilai numerik besar, dan label keterangan.

### 3. `AnomalyAlertCard.kt`
Card khusus peringatan anomali sistem untuk Kepsek/Pejabat. Warna menyesuaikan severity (Warning: Amber, Error: Red, Info: Cyan).

### 4. `StatusBadge.kt`
Badge status kehadiran dengan warna background transparan khas:
- **HADIR**: Emerald Green
- **IZIN**: Blue
- **SAKIT**: Amber Yellow
- **ALPA**: Red

### 5. `LoadingOverlay.kt`
Progress bar melingkar di tengah layar saat data dipanggil dari backend.

### 6. `EmptyState.kt`
Ilustrasi ikon dan teks keterangan saat list/data kosong dari backend.

### 7. `ErrorState.kt`
Tampilan gangguan koneksi internet lengkap dengan tombol **"Coba Lagi"** untuk retry API request.
