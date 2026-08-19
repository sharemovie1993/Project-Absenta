# 🛡️ ABSENTA.ID – LAPORAN KEPATUHAN HARDENING & STRUKTUR ARSITEKTUR

Dokumen ini adalah **Rincian Refaktor Hardening** terpusat yang dihasilkan secara otomatis oleh *Super Smart Static Audit Engine*. Gunakan dokumen ini sebagai peta jalan (roadmap) untuk memberikan instruksi hardening selanjutnya kepada AI.

---

## 📊 KESEHATAN ARSITEKTUR APLIKASI (EXECUTIVE SUMMARY)

| Metrik Evaluasi | Hasil Peminidaian | Persentase | Status |
|---|---|---|---|
| **Total Halaman Utama** | **205 Halaman** | 100% | - |
| **✅ Lolos Sempurna (Hardened)** | **23 Halaman** | 11% | **Sangat Baik** |
| **⚠️ Sebagian Terstandar (Partial)** | **107 Halaman** | 52% | **Butuh Sentuhan Ringan** |
| **❌ Belum Terstandar (Non-Compliant)** | **75 Halaman** | 37% | **Prioritas Utama Refaktor** |

---

## 🛠️ DAFTAR RINCIAN REFAKTOR PER-HALAMAN

Berikut adalah rincian masalah teknis riil yang terdeteksi di setiap file halaman utama:

### 📄 Halaman: `BackupPage.tsx`
* **Lokasi File:** [BackupPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/BackupPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' atau 'toolbarRight').
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `ProfilePage.tsx`
* **Lokasi File:** [ProfilePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/account/ProfilePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' atau 'toolbarRight').
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1216 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [ProfilePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/account/ProfilePage.tsx) (1216 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Mendeteksi ekspor PDF manual/mentah. Gunakan modul cetak PDF terstandar di 'src/utils/print/' untuk menjaga konsistensi template kop surat resmi.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `AnggotaKegiatanEskulPage.tsx`
* **Lokasi File:** [AnggotaKegiatanEskulPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/AnggotaKegiatanEskulPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Menggunakan dialog alert() atau confirm() bawaan browser. Gunakan hook useToast() untuk feedback pesan, atau useConfirm() untuk dialog konfirmasi modern.
  * ❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 873 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [AnggotaKegiatanEskulPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/AnggotaKegiatanEskulPage.tsx) (873 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `AttendanceDashboardPage.tsx`
* **Lokasi File:** [AttendanceDashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/AttendanceDashboardPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1053 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [AttendanceDashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/AttendanceDashboardPage.tsx) (529 baris), [AttendanceTvModeLayout.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/components/AttendanceTvModeLayout.tsx) (346 baris), [AttendanceDashboardComponents.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/components/AttendanceDashboardComponents.tsx) (178 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `CetakBerkasAbsensiPage.tsx`
* **Lokasi File:** [CetakBerkasAbsensiPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/CetakBerkasAbsensiPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar

---

### 📄 Halaman: `AttendanceTvModeLayout.tsx`
* **Lokasi File:** [AttendanceTvModeLayout.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/components/AttendanceTvModeLayout.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `DeviceManagementPage.tsx`
* **Lokasi File:** [DeviceManagementPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/DeviceManagementPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `FaceTemplatePage.tsx`
* **Lokasi File:** [FaceTemplatePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/FaceTemplatePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `JadwalKegiatanFormModal.tsx`
* **Lokasi File:** [JadwalKegiatanFormModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/JadwalKegiatanFormModal.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `MonitoringKbmPage.tsx`
* **Lokasi File:** [MonitoringKbmPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/monitoring/MonitoringKbmPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.

---

### 📄 Halaman: `PetugasPage.tsx`
* **Lokasi File:** [PetugasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/PetugasPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.

---

### 📄 Halaman: `RekapBulananMapelPage.tsx`
* **Lokasi File:** [RekapBulananMapelPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapBulananMapelPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `RekapHarianKelasPage.tsx`
* **Lokasi File:** [RekapHarianKelasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapHarianKelasPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `ApprovalsPage.tsx`
* **Lokasi File:** [ApprovalsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/ApprovalsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `BillingDashboardPage.tsx`
* **Lokasi File:** [BillingDashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/BillingDashboardPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `BillingReportsPage.tsx`
* **Lokasi File:** [BillingReportsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/BillingReportsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `BillingSettingsPage.tsx`
* **Lokasi File:** [BillingSettingsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/BillingSettingsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `CheckoutPage.tsx`
* **Lokasi File:** [CheckoutPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/CheckoutPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1109 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [CheckoutPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/CheckoutPage.tsx) (1109 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `MonitoringPage.tsx`
* **Lokasi File:** [MonitoringPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/MonitoringPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `MySubscriptionPage.tsx`
* **Lokasi File:** [MySubscriptionPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/MySubscriptionPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `PlansPage.tsx`
* **Lokasi File:** [PlansPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/PlansPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `RABCalculatorPage.tsx`
* **Lokasi File:** [RABCalculatorPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/RABCalculatorPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Menggunakan listeners/timer (addEventListener, setInterval, setTimeout) di dalam useEffect tetapi lupa menulis fungsi return cleanup (Kebocoran Memori Klien)
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki guard Loading/Skeleton. Sediakan loading state guard (seperti 'isLoading', 'isFetching', 'loading', atau komponen <Skeleton />).
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' atau 'toolbarRight').
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1389 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [RABCalculatorPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/RABCalculatorPage.tsx) (1389 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant="premium"> dari '@/components/ui/AnalyticsCard'.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ⚠️  Terdeteksi teks branding platform statis yang ter-hardcode (Pelanggaran Kesiapan Whitelabel Dinas). Wajib melakukan refaktor secara best-practice: (1) DILARANG KERAS menulis teks 'Absenta.id' atau 'Absenta' secara permanen (hardcoded) di dalam tag JSX header/title/footer. (2) Ambil profil branding dinamis dari API/Layout dengan menyisipkan 'tenantName' atau 'systemConfig'. (3) Gunakan variabel dinamis '{tenantName || systemConfig?.app_name || "Portal Sekolah"}' pada teks tampilan. (4) Bungkus halaman dengan <AcademicPageLayout> atau <PageLayout> yang secara otomatis menyuplai branding Whitelabel tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `SubscriptionsPage.tsx`
* **Lokasi File:** [SubscriptionsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/SubscriptionsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `TripayHealthPage.tsx`
* **Lokasi File:** [TripayHealthPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/TripayHealthPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `TripaySimulatorPage.tsx`
* **Lokasi File:** [TripaySimulatorPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/TripaySimulatorPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `AuditPage.tsx`
* **Lokasi File:** [AuditPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/AuditPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `BpbkWorkspacePage.tsx`
* **Lokasi File:** [BpbkWorkspacePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/BpbkWorkspacePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)

---

### 📄 Halaman: `CetakBerkasBkPage.tsx`
* **Lokasi File:** [CetakBerkasBkPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/CetakBerkasBkPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)

---

### 📄 Halaman: `PemanggilanPage.tsx`
* **Lokasi File:** [PemanggilanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/PemanggilanPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Menggunakan listeners/timer (addEventListener, setInterval, setTimeout) di dalam useEffect tetapi lupa menulis fungsi return cleanup (Kebocoran Memori Klien)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1452 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [PemanggilanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/PemanggilanPage.tsx) (39 baris), [PemanggilanSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/components/PemanggilanSection.tsx) (1026 baris), [PemanggilanCard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/components/PemanggilanCard.tsx) (387 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `ReportsPage.tsx`
* **Lokasi File:** [ReportsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/ReportsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant="premium"> dari '@/components/ui/AnalyticsCard'.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `CommunicationCenterPage.tsx`
* **Lokasi File:** [CommunicationCenterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/communication/CommunicationCenterPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `Announcements.tsx`
* **Lokasi File:** [Announcements.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Announcements.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `OpnameDetail.tsx`
* **Lokasi File:** [OpnameDetail.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/OpnameDetail.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Menggunakan dialog alert() atau confirm() bawaan browser. Gunakan hook useToast() untuk feedback pesan, atau useConfirm() untuk dialog konfirmasi modern.
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 660 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [OpnameDetail.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/OpnameDetail.tsx) (660 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `LoanDetail.tsx`
* **Lokasi File:** [LoanDetail.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/LoanDetail.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `Loans.tsx`
* **Lokasi File:** [Loans.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Loans.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `TicketDetail.tsx`
* **Lokasi File:** [TicketDetail.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/TicketDetail.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `Tickets.tsx`
* **Lokasi File:** [Tickets.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Tickets.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `DashboardPage.tsx`
* **Lokasi File:** [DashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/dashboard/DashboardPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `DocumentActivityPage.tsx`
* **Lokasi File:** [DocumentActivityPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/documents/DocumentActivityPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' atau 'toolbarRight').
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `ForbiddenPage.tsx`
* **Lokasi File:** [ForbiddenPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/error/ForbiddenPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `NotFoundPage.tsx`
* **Lokasi File:** [NotFoundPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/error/NotFoundPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `ServerErrorPage.tsx`
* **Lokasi File:** [ServerErrorPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/error/ServerErrorPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `BkkPage.tsx`
* **Lokasi File:** [BkkPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/BkkPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1154 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [BkkPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/BkkPage.tsx) (60 baris), [BkkSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/BkkSection.tsx) (501 baris), [BkkModals.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/bkk/BkkModals.tsx) (344 baris), [JobCard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/bkk/JobCard.tsx) (98 baris), [BkkPelamarTab.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/bkk/BkkPelamarTab.tsx) (151 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `InputNilaiPklPage.tsx`
* **Lokasi File:** [InputNilaiPklPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/InputNilaiPklPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `TefaPage.tsx`
* **Lokasi File:** [TefaPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/TefaPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `TracerStudyPage.tsx`
* **Lokasi File:** [TracerStudyPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/TracerStudyPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `SettingsPage.tsx`
* **Lokasi File:** [SettingsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/SettingsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `JadwalPiketGuruPage.tsx`
* **Lokasi File:** [JadwalPiketGuruPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/JadwalPiketGuruPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1626 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [JadwalPiketGuruPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/JadwalPiketGuruPage.tsx) (1626 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `MenuAuditPage.tsx`
* **Lokasi File:** [MenuAuditPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/management/MenuAuditPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `MenuManagementPage.tsx`
* **Lokasi File:** [MenuManagementPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/management/MenuManagementPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `RoleManagementPage.tsx`
* **Lokasi File:** [RoleManagementPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/management/RoleManagementPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `TrialEmailSequencePage.tsx`
* **Lokasi File:** [TrialEmailSequencePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/notifications/TrialEmailSequencePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Komponen <Table> ditemukan tetapi tidak memiliki implementasi Pagination. Wajib menyediakan properti 'pagination' dengan callback 'onPageChange' dan 'onLimitChange'.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `WhatsAppHealthPage.tsx`
* **Lokasi File:** [WhatsAppHealthPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/notifications/WhatsAppHealthPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `HomePage.tsx`
* **Lokasi File:** [HomePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/HomePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.

---

### 📄 Halaman: `ServiceDetailPage.tsx`
* **Lokasi File:** [ServiceDetailPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/ServiceDetailPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `SIPLaHAuditVerifyPage.tsx`
* **Lokasi File:** [SIPLaHAuditVerifyPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/SIPLaHAuditVerifyPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `SuratKeluarPublicViewPage.tsx`
* **Lokasi File:** [SuratKeluarPublicViewPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/SuratKeluarPublicViewPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `SuratKeluarQuickApprovePage.tsx`
* **Lokasi File:** [SuratKeluarQuickApprovePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/SuratKeluarQuickApprovePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `P5Page.tsx`
* **Lokasi File:** [P5Page.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/rapor/P5Page.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ❌ Aksi utama halaman (onAdd, onImport, dll.) terdeteksi tetapi tidak diletakkan pada properti toolbar Table (Wajib: 'toolbarLeft' atau 'toolbarRight').
  * ❌ Menggunakan dialog alert() atau confirm() bawaan browser. Gunakan hook useToast() untuk feedback pesan, atau useConfirm() untuk dialog konfirmasi modern.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `CetakBerkasSarprasPage.tsx`
* **Lokasi File:** [CetakBerkasSarprasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/CetakBerkasSarprasPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar

---

### 📄 Halaman: `SarprasCatalogPage.tsx`
* **Lokasi File:** [SarprasCatalogPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/SarprasCatalogPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ❌ Belum menggunakan PremiumFeatureGate untuk proteksi modul berbayar
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `BackupsPage.tsx`
* **Lokasi File:** [BackupsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/BackupsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `CalendarPresetsPage.tsx`
* **Lokasi File:** [CalendarPresetsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/CalendarPresetsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `RevenueIntelligencePage.tsx`
* **Lokasi File:** [RevenueIntelligencePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/intelligence/RevenueIntelligencePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `UpgradeIntelligencePage.tsx`
* **Lokasi File:** [UpgradeIntelligencePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/intelligence/UpgradeIntelligencePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `JurusanPresetsPage.tsx`
* **Lokasi File:** [JurusanPresetsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/JurusanPresetsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `KurikulumStandardsPage.tsx`
* **Lokasi File:** [KurikulumStandardsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/KurikulumStandardsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ❌ Terdeteksi data tiruan lokal (mock/dummy/sample/temp/test) atau base URL API / IP lokal ter-hardcode. Pindahkan data tiruan ke file terpisah di luar halaman, dan gunakan base URL dari Axios instance.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `LibraryTemplatesPage.tsx`
* **Lokasi File:** [LibraryTemplatesPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/LibraryTemplatesPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant="premium"> dari '@/components/ui/AnalyticsCard'.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `MapelPresetsPage.tsx`
* **Lokasi File:** [MapelPresetsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/MapelPresetsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `PlatformIntelligencePage.tsx`
* **Lokasi File:** [PlatformIntelligencePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/PlatformIntelligencePage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `RevenueDashboardPage.tsx`
* **Lokasi File:** [RevenueDashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/revenue/RevenueDashboardPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)

---

### 📄 Halaman: `TenantDetailPage.tsx`
* **Lokasi File:** [TenantDetailPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/TenantDetailPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `TopikPresetsPage.tsx`
* **Lokasi File:** [TopikPresetsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/TopikPresetsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Komponen berat (Modal, Form, Excel, Loader) terdeteksi tetapi tidak menggunakan lazy() & Suspense (Beban Bundle Awal Berat)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1080 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [TopikPresetsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/TopikPresetsPage.tsx) (457 baris), [LibraryTemplatesPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/LibraryTemplatesPage.tsx) (623 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `EasyTunnelPage.tsx`
* **Lokasi File:** [EasyTunnelPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/system/EasyTunnelPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ❌ Menggunakan dialog alert() atau confirm() bawaan browser. Gunakan hook useToast() untuk feedback pesan, atau useConfirm() untuk dialog konfirmasi modern.
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1934 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [EasyTunnelPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/system/EasyTunnelPage.tsx) (1934 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ⚠️  Terdeteksi teks branding platform statis yang ter-hardcode (Pelanggaran Kesiapan Whitelabel Dinas). Wajib melakukan refaktor secara best-practice: (1) DILARANG KERAS menulis teks 'Absenta.id' atau 'Absenta' secara permanen (hardcoded) di dalam tag JSX header/title/footer. (2) Ambil profil branding dinamis dari API/Layout dengan menyisipkan 'tenantName' atau 'systemConfig'. (3) Gunakan variabel dinamis '{tenantName || systemConfig?.app_name || "Portal Sekolah"}' pada teks tampilan. (4) Bungkus halaman dengan <AcademicPageLayout> atau <PageLayout> yang secara otomatis menyuplai branding Whitelabel tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `TenantsPage.tsx`
* **Lokasi File:** [TenantsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/tenants/TenantsPage.tsx)
* **Status Kepatuhan:** 🔴 **BELUM TERSTANDAR (Prioritas Hardening Utama!)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `CetakBerkasPage.tsx`
* **Lokasi File:** [CetakBerkasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/CetakBerkasPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Belum menggunakan AcademicPageLayout atau InfraErrorBoundary (Kerentanan Visual Halaman Total)
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `KelasPage.tsx`
* **Lokasi File:** [KelasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/KelasPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual

---

### 📄 Halaman: `MapelPage.tsx`
* **Lokasi File:** [MapelPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/MapelPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.

---

### 📄 Halaman: `PpdbMappingPage.tsx`
* **Lokasi File:** [PpdbMappingPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/ppdb/PpdbMappingPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 948 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [PpdbMappingPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/ppdb/PpdbMappingPage.tsx) (881 baris), [KelasExpandedPanel.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/ppdb/KelasExpandedPanel.tsx) (67 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `SemesterPage.tsx`
* **Lokasi File:** [SemesterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/SemesterPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `SiswaPage.tsx`
* **Lokasi File:** [SiswaPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/SiswaPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `StaffActivityLogPage.tsx`
* **Lokasi File:** [StaffActivityLogPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/StaffActivityLogPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `AcademicTransitionPage.tsx`
* **Lokasi File:** [AcademicTransitionPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/transition/AcademicTransitionPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `AttendanceSettingsPage.tsx`
* **Lokasi File:** [AttendanceSettingsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/AttendanceSettingsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual

---

### 📄 Halaman: `GuruMonitoringPage.tsx`
* **Lokasi File:** [GuruMonitoringPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/GuruMonitoringPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `JadwalKegiatanPage.tsx`
* **Lokasi File:** [JadwalKegiatanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/JadwalKegiatanPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1232 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [JadwalKegiatanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/JadwalKegiatanPage.tsx) (487 baris), [JadwalKegiatanFormModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/JadwalKegiatanFormModal.tsx) (745 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `MyAttendancePage.tsx`
* **Lokasi File:** [MyAttendancePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/MyAttendancePage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `AttendanceOpsPage.tsx`
* **Lokasi File:** [AttendanceOpsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/AttendanceOpsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1957 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [AttendanceOpsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/AttendanceOpsPage.tsx) (122 baris), [ModeSimpleView.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/ModeSimpleView.tsx) (185 baris), [PendingSiswaModule.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/PendingSiswaModule.tsx) (241 baris), [ModeMultiSesiView.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/ModeMultiSesiView.tsx) (323 baris), [SessionManagerModule.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/SessionManagerModule.tsx) (1086 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `GateInputModule.tsx`
* **Lokasi File:** [GateInputModule.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/GateInputModule.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `ModeMultiSesiView.tsx`
* **Lokasi File:** [ModeMultiSesiView.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/ModeMultiSesiView.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)

---

### 📄 Halaman: `PendingSiswaModule.tsx`
* **Lokasi File:** [PendingSiswaModule.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/PendingSiswaModule.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `SessionManagerModule.tsx`
* **Lokasi File:** [SessionManagerModule.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/SessionManagerModule.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1086 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [SessionManagerModule.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/SessionManagerModule.tsx) (1086 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `RekapBulananKelasPage.tsx`
* **Lokasi File:** [RekapBulananKelasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapBulananKelasPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `RekapBulananSiswaPage.tsx`
* **Lokasi File:** [RekapBulananSiswaPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapBulananSiswaPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `RekapHarianSiswaPage.tsx`
* **Lokasi File:** [RekapHarianSiswaPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapHarianSiswaPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `RekapPage.tsx`
* **Lokasi File:** [RekapPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 874 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [RekapPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapPage.tsx) (121 baris), [RekapBulananKelasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapBulananKelasPage.tsx) (382 baris), [RekapBulananMapelPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/rekap/RekapBulananMapelPage.tsx) (371 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `RiwayatAjarPage.tsx`
* **Lokasi File:** [RiwayatAjarPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/RiwayatAjarPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `TrackingSiswaPage.tsx`
* **Lokasi File:** [TrackingSiswaPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/TrackingSiswaPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `ForgotPasswordPage.tsx`
* **Lokasi File:** [ForgotPasswordPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/auth/ForgotPasswordPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `LoginPage.tsx`
* **Lokasi File:** [LoginPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/auth/LoginPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `ResetPasswordConfirmPage.tsx`
* **Lokasi File:** [ResetPasswordConfirmPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/auth/ResetPasswordConfirmPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `BillingsPage.tsx`
* **Lokasi File:** [BillingsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/BillingsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.

---

### 📄 Halaman: `PaymentsPage.tsx`
* **Lokasi File:** [PaymentsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/PaymentsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 872 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [PaymentsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/PaymentsPage.tsx) (708 baris), [PaymentColumns.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/components/PaymentColumns.tsx) (164 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `ServiceCenterPage.tsx`
* **Lokasi File:** [ServiceCenterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/ServiceCenterPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 838 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [ServiceCenterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/billing/ServiceCenterPage.tsx) (838 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `CasesPage.tsx`
* **Lokasi File:** [CasesPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/CasesPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1107 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [CasesPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/CasesPage.tsx) (39 baris), [CasesSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/components/CasesSection.tsx) (489 baris), [CaseTable.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/components/cases/CaseTable.tsx) (213 baris), [CaseFormModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/components/cases/CaseFormModal.tsx) (159 baris), [CaseDetailModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/components/cases/CaseDetailModal.tsx) (207 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `DashboardPage.tsx`
* **Lokasi File:** [DashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/DashboardPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `HomeVisitPage.tsx`
* **Lokasi File:** [HomeVisitPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/HomeVisitPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `KonselingPage.tsx`
* **Lokasi File:** [KonselingPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/KonselingPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `RujukanPage.tsx`
* **Lokasi File:** [RujukanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/RujukanPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `SiswaKasusPage.tsx`
* **Lokasi File:** [SiswaKasusPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/SiswaKasusPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `Accounting.tsx`
* **Lokasi File:** [Accounting.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Accounting.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Terdeteksi fitur ekspor/impor data tetapi belum memenuhi standar audit. Petunjuk Perbaikan: 1) Gunakan helper standar ter-style 'generateImportTemplate' dari '@/utils/export.utils' untuk unduhan template Excel. 2) Pastikan proses impor/ekspor dilindungi loading guard (state 'isExporting'/'processing') untuk menghindari double-submit. 3) Bungkus logika dengan try-catch block untuk menangani error secara aman.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ⚠️  Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `CoopTvMode.tsx`
* **Lokasi File:** [CoopTvMode.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/CoopTvMode.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 504 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [CoopTvMode.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/CoopTvMode.tsx) (504 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `OpnameFormModal.tsx`
* **Lokasi File:** [OpnameFormModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/OpnameFormModal.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `ProductFormModal.tsx`
* **Lokasi File:** [ProductFormModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/ProductFormModal.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `ReceiptModal.tsx`
* **Lokasi File:** [ReceiptModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/ReceiptModal.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `Dashboard.tsx`
* **Lokasi File:** [Dashboard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Dashboard.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1307 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [Dashboard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Dashboard.tsx) (622 baris), [CoopTvMode.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/CoopTvMode.tsx) (504 baris), [ReceiptModal.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/components/ReceiptModal.tsx) (181 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `LaporanInventori.tsx`
* **Lokasi File:** [LaporanInventori.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/LaporanInventori.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi fitur ekspor/impor data tetapi belum memenuhi standar audit. Petunjuk Perbaikan: 1) Gunakan helper standar ter-style 'generateImportTemplate' dari '@/utils/export.utils' untuk unduhan template Excel. 2) Pastikan proses impor/ekspor dilindungi loading guard (state 'isExporting'/'processing') untuk menghindari double-submit. 3) Bungkus logika dengan try-catch block untuk menangani error secara aman.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `POS.tsx`
* **Lokasi File:** [POS.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/POS.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)

---

### 📄 Halaman: `PPOB.tsx`
* **Lokasi File:** [PPOB.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/PPOB.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `Products.tsx`
* **Lokasi File:** [Products.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Products.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `Savings.tsx`
* **Lokasi File:** [Savings.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Savings.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi fitur ekspor/impor data tetapi belum memenuhi standar audit. Petunjuk Perbaikan: 1) Gunakan helper standar ter-style 'generateImportTemplate' dari '@/utils/export.utils' untuk unduhan template Excel. 2) Pastikan proses impor/ekspor dilindungi loading guard (state 'isExporting'/'processing') untuk menghindari double-submit. 3) Bungkus logika dengan try-catch block untuk menangani error secara aman.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `Settings.tsx`
* **Lokasi File:** [Settings.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Settings.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `SHU.tsx`
* **Lokasi File:** [SHU.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/SHU.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `Vouchers.tsx`
* **Lokasi File:** [Vouchers.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Vouchers.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `SuratKeluarPage.tsx`
* **Lokasi File:** [SuratKeluarPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/correspondence/SuratKeluarPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `SuratMasukPage.tsx`
* **Lokasi File:** [SuratMasukPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/correspondence/SuratMasukPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Komponen <Table> ditemukan tetapi tidak memiliki implementasi sorting. Hubungkan properti 'sortBy', 'sortOrder', 'onSort', dan tandai kolom dengan 'sortable: true'.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `DocumentCenterPage.tsx`
* **Lokasi File:** [DocumentCenterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/documents/DocumentCenterPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `AbsensiPklPage.tsx`
* **Lokasi File:** [AbsensiPklPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/AbsensiPklPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `BkkModals.tsx`
* **Lokasi File:** [BkkModals.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/bkk/BkkModals.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `JobCard.tsx`
* **Lokasi File:** [JobCard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/bkk/JobCard.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `BkkSection.tsx`
* **Lokasi File:** [BkkSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/BkkSection.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 501 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [BkkSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/BkkSection.tsx) (501 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.

---

### 📄 Halaman: `HubinDashboardComponents.tsx`
* **Lokasi File:** [HubinDashboardComponents.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/HubinDashboardComponents.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `HubinDashboardSection.tsx`
* **Lokasi File:** [HubinDashboardSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/HubinDashboardSection.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `HubinTvModeLayout.tsx`
* **Lokasi File:** [HubinTvModeLayout.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/HubinTvModeLayout.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant="premium"> dari '@/components/ui/AnalyticsCard'.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `TefaSection.tsx`
* **Lokasi File:** [TefaSection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/TefaSection.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `TracerStudySection.tsx`
* **Lokasi File:** [TracerStudySection.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/TracerStudySection.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `HubinDashboardPage.tsx`
* **Lokasi File:** [HubinDashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/HubinDashboardPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1056 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [HubinDashboardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/HubinDashboardPage.tsx) (297 baris), [HubinTvModeLayout.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/HubinTvModeLayout.tsx) (412 baris), [HubinDashboardComponents.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/HubinDashboardComponents.tsx) (347 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `MitraIndustriPage.tsx`
* **Lokasi File:** [MitraIndustriPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/MitraIndustriPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `MonitoringPklPage.tsx`
* **Lokasi File:** [MonitoringPklPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/MonitoringPklPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `PenempatanPklPage.tsx`
* **Lokasi File:** [PenempatanPklPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/PenempatanPklPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `CetakBerkasKesiswaanPage.tsx`
* **Lokasi File:** [CetakBerkasKesiswaanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/CetakBerkasKesiswaanPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki guard Loading/Skeleton. Sediakan loading state guard (seperti 'isLoading', 'isFetching', 'loading', atau komponen <Skeleton />).

---

### 📄 Halaman: `MonitoringKesiswaanPage.tsx`
* **Lokasi File:** [MonitoringKesiswaanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/MonitoringKesiswaanPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `PelanggaranPage.tsx`
* **Lokasi File:** [PelanggaranPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/PelanggaranPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `PiketPage.tsx`
* **Lokasi File:** [PiketPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/PiketPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `PiketSecurityStandalonePage.tsx`
* **Lokasi File:** [PiketSecurityStandalonePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/PiketSecurityStandalonePage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki guard Loading/Skeleton. Sediakan loading state guard (seperti 'isLoading', 'isFetching', 'loading', atau komponen <Skeleton />).
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.

---

### 📄 Halaman: `PrestasiPage.tsx`
* **Lokasi File:** [PrestasiPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/PrestasiPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `CetakBerkasKurikulumPage.tsx`
* **Lokasi File:** [CetakBerkasKurikulumPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/CetakBerkasKurikulumPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)

---

### 📄 Halaman: `Dashboard.tsx`
* **Lokasi File:** [Dashboard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/Dashboard.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `JadwalKontrakKbmPage.tsx`
* **Lokasi File:** [JadwalKontrakKbmPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/JadwalKontrakKbmPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Ditemukan elemen seleksi (<select> atau <Select>) tetapi belum menggunakan SearchableSelect (UX Dropdown Terbatas)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `JadwalPelajaranPage.tsx`
* **Lokasi File:** [JadwalPelajaranPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/JadwalPelajaranPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)

---

### 📄 Halaman: `JamKBMPage.tsx`
* **Lokasi File:** [JamKBMPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/JamKBMPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `KalenderAkademikPage.tsx`
* **Lokasi File:** [KalenderAkademikPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/KalenderAkademikPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `KospBuilderPage.tsx`
* **Lokasi File:** [KospBuilderPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/KospBuilderPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `MasterStrukturPage.tsx`
* **Lokasi File:** [MasterStrukturPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/MasterStrukturPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `PerangkatAjarPage.tsx`
* **Lokasi File:** [PerangkatAjarPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/PerangkatAjarPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 1056 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [PerangkatAjarPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/PerangkatAjarPage.tsx) (1056 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.

---

### 📄 Halaman: `SupervisiPage.tsx`
* **Lokasi File:** [SupervisiPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/SupervisiPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 837 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [SupervisiPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/SupervisiPage.tsx) (632 baris), [SupervisiAnalyticsDashboard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/SupervisiAnalyticsDashboard.tsx) (205 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium. Disarankan Cara 1: Lewatkan data via properti 'stats={[...]}' pada <AcademicPageLayout> (secara default me-render varian premium). Cara 2: Impor langsung <AnalyticsCard variant="premium"> dari '@/components/ui/AnalyticsCard'.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `Login.tsx`
* **Lokasi File:** [Login.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/Login.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `NotificationsPage.tsx`
* **Lokasi File:** [NotificationsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/notifications/NotificationsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `WhatsAppChatLogPage.tsx`
* **Lokasi File:** [WhatsAppChatLogPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/notifications/WhatsAppChatLogPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 873 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [WhatsAppChatLogPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/notifications/WhatsAppChatLogPage.tsx) (873 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `WhatsAppOnboardingPage.tsx`
* **Lokasi File:** [WhatsAppOnboardingPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/notifications/WhatsAppOnboardingPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `AboutUsPage.tsx`
* **Lokasi File:** [AboutUsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/AboutUsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)

---

### 📄 Halaman: `DataProcessingAgreementPage.tsx`
* **Lokasi File:** [DataProcessingAgreementPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/DataProcessingAgreementPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').

---

### 📄 Halaman: `EmailVerificationStatusPage.tsx`
* **Lokasi File:** [EmailVerificationStatusPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/EmailVerificationStatusPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `PricingPage.tsx`
* **Lokasi File:** [PricingPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/PricingPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `PrivacyPolicyPage.tsx`
* **Lokasi File:** [PrivacyPolicyPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/PrivacyPolicyPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').

---

### 📄 Halaman: `TermsOfServicePage.tsx`
* **Lokasi File:** [TermsOfServicePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/TermsOfServicePage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi kode warna keras (inline style rgb/hex), arbitrary color ([#...]), atau kelas warna Tailwind dengan bobot tidak valid (typo) yang merusak konsistensi tema visual
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').

---

### 📄 Halaman: `CetakRaporPage.tsx`
* **Lokasi File:** [CetakRaporPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/rapor/CetakRaporPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)

---

### 📄 Halaman: `InputNilaiPage.tsx`
* **Lokasi File:** [InputNilaiPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/rapor/InputNilaiPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Halaman menggunakan Layout tetapi tidak menyediakan properti "instruction" (UX: Pengguna kehilangan panduan fitur)
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)

---

### 📄 Halaman: `SarprasDashboardComponents.tsx`
* **Lokasi File:** [SarprasDashboardComponents.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/components/SarprasDashboardComponents.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `SarprasTvModeLayout.tsx`
* **Lokasi File:** [SarprasTvModeLayout.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/components/SarprasTvModeLayout.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `SarprasDashboard.tsx`
* **Lokasi File:** [SarprasDashboard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/SarprasDashboard.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Terdeteksi properti "toolbar" pada Layout saat Tabel hadir (Pindahkan aksi ke toolbar Table untuk konsistensi)
  * ⚠️  Ukuran berkas terlalu besar (total terdeteksi 859 baris). Batas maks: Halaman Utama < 800 baris, Subkomponen < 500 baris. Kontributor: [SarprasDashboard.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/SarprasDashboard.tsx) (326 baris), [SarprasTvModeLayout.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/components/SarprasTvModeLayout.tsx) (334 baris), [SarprasDashboardComponents.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/components/SarprasDashboardComponents.tsx) (199 baris). Pindahkan subkomponen UI ke folder 'src/components/[kategori]/[nama_modul]/', gunakan sufiks penamaan standar (Form/List/Modal), dan muat dengan lazy() + Suspense.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.

---

### 📄 Halaman: `SarprasInventoryPage.tsx`
* **Lokasi File:** [SarprasInventoryPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/SarprasInventoryPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman melakukan fetch data tetapi tidak memiliki penanganan Empty State. Pastikan terdapat pengecekan kondisi data kosong (seperti 'data.length === 0', 'isEmpty', atau penegasian '!data.length').

---

### 📄 Halaman: `SarprasLoansPage.tsx`
* **Lokasi File:** [SarprasLoansPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/SarprasLoansPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.

---

### 📄 Halaman: `SarprasMaintenancePage.tsx`
* **Lokasi File:** [SarprasMaintenancePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/sarpras/SarprasMaintenancePage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ❌ Terdeteksi manipulasi tanggal tetapi belum mematuhi standarisasi format tanggal nasional '05 Jul 2026' (toLocaleDateString dengan 'id-ID' & options day: '2-digit', month: 'short', year: 'numeric') dan belum terintegrasi dengan proteksi timezone tenant.
  * ❌ Terdeteksi penggunaan tombol flat/lemah (variant='primary'/'secondary') di dalam toolbar halaman. Gunakan varian khusus toolbar (seperti variant='toolbarPrimary', variant='toolbarOutline', atau variant='toolbarDanger') dan ukuran size='toolbar' untuk memastikan affordance dan kontras tombol standar premium.
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `SettingsPage.tsx`
* **Lokasi File:** [SettingsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/settings/SettingsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `SystemUpdatePage.tsx`
* **Lokasi File:** [SystemUpdatePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/settings/SystemUpdatePage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Pemetaan data tidak aman (.map tanpa pertahanan ?.map). Gunakan optional chaining untuk mencegah crash rendering jika data bernilai null/undefined.
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi isu responsivitas pada antarmuka (Pelanggaran Pilar 30 Adaptabilitas Responsif Multi-Perangkat). Wajib melakukan refaktor secara best-practice: (1) Pada Topbar (<640px), sembunyikan badge status redundan 'hidden sm:block' agar judul halaman mendapatkan 100% ruang lebar penuh tanpa terpotong kaku. (2) Pada TabSwitcher, gunakan container touch-scroll 'overflow-x-auto no-scrollbar flex-nowrap' dengan item 'whitespace-nowrap'. (3) Pada Kartu Statistik, gunakan varian Mobile-Mini/Compact Premium ('variant="compact-premium"' atau 'mobileCompact={true}') agar hemat 50% ruang vertikal di layar ponsel dan sediakan fitur collapsible. (4) Pada Form & Input, pastikan seluruh container memiliki kelas 'w-full max-w-full min-w-0' agar elemen input dan ikon tidak terpotong (zero-clipping).

---

### 📄 Halaman: `WhatsappSettingsPage.tsx`
* **Lokasi File:** [WhatsappSettingsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/settings/WhatsappSettingsPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `InfraControlCenterPage.tsx`
* **Lokasi File:** [InfraControlCenterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/superadmin/infra/InfraControlCenterPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)
  * ⚠️  Elemen/komponen form ditemukan (input, select, textarea, Input, Select, Textarea, SearchableSelect) tetapi tidak memiliki atribut aksesibilitas aria-label atau relasi label htmlFor (Pelanggaran Aksesibilitas Web)
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.
  * ❌ Belum menggunakan komponen reusable TabSwitcher untuk navigasi tab. Ganti TabsList atau tombol switcher manual dengan komponen <TabSwitcher />.

---

### 📄 Halaman: `CancelledPage.tsx`
* **Lokasi File:** [CancelledPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/system/CancelledPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)

---

### 📄 Halaman: `SuspendedPage.tsx`
* **Lokasi File:** [SuspendedPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/system/SuspendedPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Terdeteksi penggunaan tipe data longgar ": any" atau casting tidak aman "as any" (Melemahkan keamanan tipe TS)

---

### 📄 Halaman: `TestLogin.tsx`
* **Lokasi File:** [TestLogin.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/TestLogin.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ⚠️  Menggunakan Layout tetapi belum melampirkan properti 'hardeningModuleKey' pada komponen AcademicPageLayout.
  * ⚠️  Memuat list data tetapi tidak menggunakan useMemo untuk data list/kolom dan useCallback untuk event handlers (Beban DOM Churn Tinggi)
  * ⚠️  Halaman menggunakan Layout tetapi konten tidak dibungkus dalam kontainer SectionCard atau Card (Pelanggaran Konsistensi Visual Kontainer). Petunjuk Perbaikan: (1) Bungkus konten utama dengan <SectionCard> atau <Card>. (2) WAJIB gunakan prop fullWidth pada SectionCard untuk layout konten vertikal (tanpanya inner wrapper otomatis menjadi grid 2-kolom yang menyebabkan card terpotong ke kanan). (3) Tambahkan min-w-0 di className jika SectionCard berada di dalam flex atau grid parent agar card dapat menyusut dengan benar. Contoh: <SectionCard fullWidth className="flex flex-col w-full min-w-0">.
  * ⚠️  Terdeteksi elemen form input tetapi belum dilindungi oleh Zod Schema Validation Guard. Wajib melakukan refaktor secara best-practice: (1) Impor 'z' dari 'zod' dan buat skema validasi z.object({...}) yang memetakan seluruh field input secara riil. (2) Lakukan validasi menggunakan schema.safeParse(formData) di dalam handler sebelum memproses data atau mengirimkannya ke API. (3) DILARANG KERAS mem-bypass audit statis dengan menyisipkan komentar kosong atau skema kosong! Seluruh modul proyek ini wajib mematuhi standar Google Platform Standards demi integritas tipe data dan sistem pertahanan berlapis (defense-in-depth) yang andal.

---

### 📄 Halaman: `UsersPage.tsx`
* **Lokasi File:** [UsersPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/users/UsersPage.tsx)
* **Status Kepatuhan:** 🟡 **SEBAGIAN TERSTANDAR (Butuh Refaktor Ringan)**
* **Rincian Temuan Masalah & Rekomendasi:**
  * ❌ Terdeteksi penggunaan raw useEffect untuk pengambilan data (Pelanggaran Pilar 31 Optimasi Data Fetching). Wajib dilindungi/migrasi ke React Query (useQuery / useMutation) atau Custom Options Hook terstandar untuk mendukung caching, auto-refetch, dan performa data terpusat.

---

### 📄 Halaman: `GuruPage.tsx`
* **Lokasi File:** [GuruPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/GuruPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `JenisKegiatanMasterPage.tsx`
* **Lokasi File:** [JenisKegiatanMasterPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/JenisKegiatanMasterPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `JurusanPage.tsx`
* **Lokasi File:** [JurusanPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/JurusanPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `StrukturOrganisasiPage.tsx`
* **Lokasi File:** [StrukturOrganisasiPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/struktur-organisasi/StrukturOrganisasiPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `StudentCardPage.tsx`
* **Lokasi File:** [StudentCardPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/StudentCardPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `TahunPelajaranPage.tsx`
* **Lokasi File:** [TahunPelajaranPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/academic/TahunPelajaranPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `AttendanceDashboardComponents.tsx`
* **Lokasi File:** [AttendanceDashboardComponents.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/components/AttendanceDashboardComponents.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `ModeSimpleView.tsx`
* **Lokasi File:** [ModeSimpleView.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/attendance/ops/components/ModeSimpleView.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `AsesmenPage.tsx`
* **Lokasi File:** [AsesmenPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/bpbk/AsesmenPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `Members.tsx`
* **Lokasi File:** [Members.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/cooperative/Members.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `MemberDocsPage.tsx`
* **Lokasi File:** [MemberDocsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/documents/MemberDocsPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `CetakBerkasHubinPage.tsx`
* **Lokasi File:** [CetakBerkasHubinPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/CetakBerkasHubinPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `BkkPelamarTab.tsx`
* **Lokasi File:** [BkkPelamarTab.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/bkk/BkkPelamarTab.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `TracerFormSubfields.tsx`
* **Lokasi File:** [TracerFormSubfields.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/components/tracer/TracerFormSubfields.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `HubinWorkspacePage.tsx`
* **Lokasi File:** [HubinWorkspacePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/hubin/HubinWorkspacePage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `JenisPelanggaranPage.tsx`
* **Lokasi File:** [JenisPelanggaranPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kesiswaan/JenisPelanggaranPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `GuruMapelPage.tsx`
* **Lokasi File:** [GuruMapelPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/GuruMapelPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `RekapKBMPage.tsx`
* **Lokasi File:** [RekapKBMPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/RekapKBMPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `StrukturKurikulumPage.tsx`
* **Lokasi File:** [StrukturKurikulumPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/StrukturKurikulumPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `WaliKelasPage.tsx`
* **Lokasi File:** [WaliKelasPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/kurikulum/WaliKelasPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `LearnMorePage.tsx`
* **Lokasi File:** [LearnMorePage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/LearnMorePage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `ServicesCatalogPage.tsx`
* **Lokasi File:** [ServicesCatalogPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/public/ServicesCatalogPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

### 📄 Halaman: `ReportsPage.tsx`
* **Lokasi File:** [ReportsPage.tsx](file:///D:/BarayaProject/Project Absenta/absenta_frontend/src/pages/reports/ReportsPage.tsx)
* **Status Kepatuhan:** 🟢 **TERSTANDARISASI (Lolos Audit)**
* **Keterangan:** Halaman telah mematuhi 10 parameter audit hardening kelas dunia. Sudah siap rilis produksi!

---

