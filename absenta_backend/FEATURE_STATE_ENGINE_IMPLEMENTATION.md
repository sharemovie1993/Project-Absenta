# FEATURE_STATE_ENGINE_IMPLEMENTATION

Laporan implementasi Feature State Engine untuk pengelolaan status layanan SaaS yang konsisten di platform Absenta.

## Perubahan yang Dilakukan

### Backend
- **Feature State Enum (`src/types/feature-state.ts`)**: Menambahkan enum `FeatureState` dengan nilai: `LOCKED`, `TRIAL`, `ACTIVE`, `EXPIRED`.
- **Feature State Resolver (`src/services/feature-state-resolver.service.ts`)**:
    - Service baru untuk menghitung status fitur berdasarkan data subscription tenant secara runtime.
    - Logic: Memeriksa subscription yang relevan dengan fitur, memvalidasi status (`ACTIVE`, `TRIAL`, `EXPIRED`), dan mengecek masa berlaku (`end_date`).
- **Sidebar Service (`SidebarRenderingService`)**:
    - Integrasi dengan `FeatureStateResolver`.
    - Setiap item menu sekarang membawa properti `feature_state`.
    - Status `feature_state` otomatis diturunkan (propagate) ke child menu jika parent memiliki batasan yang lebih ketat.
- **Service Feature Guard (`serviceFeatureGuard`)**:
    - Diperbarui untuk menggunakan `FeatureStateResolver`.
    - `LOCKED` & `EXPIRED`: Mengizinkan `GET` (Preview Mode) namun memblokir mutasi data (`POST`, `PUT`, `PATCH`, `DELETE`).
    - `ACTIVE` & `TRIAL`: Mengizinkan semua operasi.

### Frontend
- **API Client (`menu.api.ts`)**: Menambahkan field `feature_state` pada interface `SidebarMenuItem`.
- **Sidebar UI (`Sidebar.tsx`)**:
    - **LOCKED**: Menampilkan ikon gembok (`Lock`).
    - **EXPIRED**: Menampilkan ikon peringatan (`AlertTriangle`) berwarna amber.
    - **TRIAL**: Menambahkan badge biru bertuliskan "TRIAL" di samping nama menu.
    - Tooltip diperbarui untuk memberikan informasi status yang lebih jelas (misal: "⚠️ Absensi (Expired)").

## Verifikasi
- **Backend Build**: `npm run build` - SUCCESS
- **Frontend Build**: `npm run build` - SUCCESS
- **Logic Verification**: Status fitur dihitung dinamis berdasarkan database subscription tanpa perlu menyimpan state permanen di tabel Menu.

## Hasil Akhir
Platform sekarang memiliki mesin status fitur yang terpadu. Hal ini memungkinkan sistem untuk memberikan perlakuan yang berbeda (visual maupun fungsional) bagi tenant yang sedang dalam masa uji coba, tenant aktif, maupun tenant yang masa berlakunya telah habis atau belum berlangganan sama sekali.
