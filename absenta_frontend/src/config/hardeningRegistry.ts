import auditReport from './hardeningAuditReport.json';

// ─── HARDENING REGISTRY & COMPLIANCE SPECIFICATION ──────────────────────────

export interface HardeningStandard {
  id: string;
  name: string;
  description: string;
  status: 'VERIFIED' | 'WARNING' | 'FAILED';
  details: string;
}

export interface ModuleHardeningConfig {
  moduleName: string;
  displayName: string;
  standards: HardeningStandard[];
}

export const HARDENING_REGISTRY: Record<string, ModuleHardeningConfig> = {
  infra_control_center: {
    moduleName: 'infra_control_center',
    displayName: 'Pusat Kontrol Infrastruktur (Cluster)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri per-tab.',
        status: 'VERIFIED',
        details: 'InfraErrorBoundary terintegrasi di 4 sub-panel utama.'
      },
      {
        id: 'metric_throttling',
        name: 'WebSocket Throttling (Ketahanan Spikes)',
        description: 'Membatasi State UI re-render dari penyiaran metrik WebSocket bertubi-tubi menjadi maksimal 1.5 detik sekali.',
        status: 'VERIFIED',
        details: 'throttle(handleUpdate, 1500) terpasang di socket listener.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Tab-Level Code Splitting)',
        description: 'Memecah JS bundle per-tab menggunakan React.lazy & Suspense, menghemat ukuran unduhan JS awal saat halaman pertama dimuat.',
        status: 'VERIFIED',
        details: 'React.lazy() dynamic chunks + skeleton loader fallback.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (DRY & Memoization)',
        description: 'Mengunci baris & definisi kolom tabel menggunakan useMemo dan useCallback untuk mencegah re-conciliation DOM tak perlu saat metrik diperbarui.',
        status: 'VERIFIED',
        details: 'useMemo terpasang pada data arrays & kolom tabel sub-panel.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Pencegahan Kebocoran Memori (Closure Cleanup)',
        description: 'Membersihkan socket listener dan reference query secara aman saat superadmin berpindah halaman atau component unmount.',
        status: 'VERIFIED',
        details: 'stable queryClientRef + socket unsubscribe cleanup return.'
      }
    ]
  },
  academic_siswa: {
    moduleName: 'academic_siswa',
    displayName: 'Database Master Siswa (Akademik)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan List Database (Fault Isolation)',
        description: 'Membungkus list utama siswa dengan Error Boundary sehingga kegagalan parsing file excel atau data API tidak mematikan fitur sidebar, menu, atau navigasi.',
        status: 'VERIFIED',
        details: 'SiswaList terbungkus di dalam InfraErrorBoundary.'
      },
      {
        id: 'network_fallback',
        name: 'Penanganan API & Fallback Recovery',
        description: 'Mengintegrasikan loading data stats dengan fallback kueri terisolasi agar saat salah satu data periode akademik gagal, UI lainnya tetap berjalan.',
        status: 'VERIFIED',
        details: 'Kueri REST terisolasi & stats loader adaptif.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Rekayasa Sumber (Code Splitting / Lazy)',
        description: 'Pemisahan bundel JS berat secara asinkron untuk modal input SiswaForm dan ExcelImportModal guna menghemat initial load.',
        status: 'VERIFIED',
        details: 'Dialog modal form terintegrasi dengan Suspense Lazy loading.'
      },
      {
        id: 'architectural_table_pagination',
        name: 'Standarisasi Pagination Tabel',
        description: 'Mewajibkan implementasi pagination pada setiap komponen Tabel untuk mencegah memory leak dan beban DOM berat.',
        status: 'VERIFIED',
        details: 'Pagination terdeteksi pada SiswaList.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Responsive Guide)',
        description: 'Mewajibkan adanya properti instruction pada layout. Panel akan otomatis terbuka pada layar > 1366px dan tertutup (dengan toggle) pada layar <= 1366px.',
        status: 'VERIFIED',
        details: 'Properti instruction terdeteksi pada AcademicPageLayout.'
      },
      {
        id: 'architectural_toolbar_standard',
        name: 'Standarisasi Toolbar Halaman',
        description: 'Mewajibkan penggunaan properti toolbar pada layout untuk menempatkan aksi utama (Tambah, Import, Export).',
        status: 'VERIFIED',
        details: 'Toolbar terdeteksi pada AcademicPageLayout.'
      },
      {
        id: 'architectural_feedback_standard',
        name: 'Sistem Feedback & Dialog Modern',
        description: 'Melarang penggunaan alert/confirm browser dan mewajibkan useToast, useConfirm, serta komponen Modal.',
        status: 'VERIFIED',
        details: 'Toast, Confirm, dan Modal terintegrasi.'
      },
      {
        id: 'architectural_container_consistency',
        name: 'Konsistensi Kontainer UI',
        description: 'Mewajibkan penggunaan SectionCard atau Card untuk membungkus konten agar visual konsisten.',
        status: 'VERIFIED',
        details: 'SectionCard/Card digunakan sebagai kontainer utama.'
      },
      {
        id: 'architectural_advanced_select',
        name: 'Komponen Seleksi Canggih (SearchableSelect)',
        description: 'Mewajibkan penggunaan SearchableSelect untuk dropdown yang memiliki dataset banyak atau membutuhkan pencarian.',
        status: 'VERIFIED',
        details: 'SearchableSelect digunakan untuk filter dan form.'
      },
      {
        id: 'architectural_table_toolbar_standard',
        name: 'Standarisasi Toolbar Kontekstual Tabel',
        description: 'Mewajibkan penggunaan properti toolbarLeft dan toolbarRight pada komponen Table untuk aksi kontekstual.',
        status: 'VERIFIED',
        details: 'Toolbar operasional terintegrasi dalam slot resmi Table.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan trigger mutation dimemosisasi dengan useMemo dan useCallback untuk meredam pemuatan ulang DOM berlebihan.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada modal handlers & stats.'
      },
      {
        id: 'rbac_protection',
        name: 'Proteksi Otorisasi Klien (RBAC Shielding)',
        description: 'Pembatasan render tombol aksi tambah, ubah, dan impor serta akses kueri data berdasarkan status otorisasi fungsional pengguna.',
        status: 'VERIFIED',
        details: 'canCreate, canEdit, dan canView terintegrasi secara ketat.'
      },
      {
        id: 'architectural_import_export',
        name: 'Standarisasi Impor & Ekspor Data (Import/Export Standard)',
        description: 'Mewajibkan fitur impor/ekspor data dilengkapi loading guard (isExporting/loading) dan pembungkus try-catch untuk mencegah double submit dan crash tanpa pesan.',
        status: 'VERIFIED',
        details: 'ExcelImportModal dan handleExport telah terproteksi loading guard dan try-catch.'
      }
    ]
  },
  academic_struktur_organisasi: {
    moduleName: 'academic_struktur_organisasi',
    displayName: 'Struktur Organisasi (Akademik)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation)',
        description: 'Mencegah kerusakan visual halaman total melalui penanganan error boundary dan loading state terisolasi.',
        status: 'VERIFIED',
        details: 'Terintegrasi di dalam router tree dan loading state.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Memoization)',
        description: 'Menggunakan useMemo dan useCallback untuk membatasi re-render saat memproses tree data struktur organisasi.',
        status: 'VERIFIED',
        details: 'useMemo terpasang pada data arrays, tab list, dan breadcrumbs.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Responsive Guide)',
        description: 'Menyediakan panduan pengguna interaktif (instruction) pada layout halaman utama.',
        status: 'VERIFIED',
        details: 'Properti instruction terdeteksi pada AcademicPageLayout.'
      },
      {
        id: 'architectural_container_consistency',
        name: 'Konsistensi Kontainer UI',
        description: 'Membungkus konten utama dengan SectionCard untuk standard visual yang selaras.',
        status: 'VERIFIED',
        details: 'SectionCard terpasang di sekeliling layout utama.'
      },
      {
        id: 'rbac_protection',
        name: 'Proteksi Otorisasi Klien (RBAC Shielding)',
        description: 'Membatasi hak akses edit dan pimpinan berdasarkan otorisasi role pengguna.',
        status: 'VERIFIED',
        details: 'Pemeriksaan capability terpasang di render button.'
      }
    ]
  },
  academic_guru: {
    moduleName: 'academic_guru',
    displayName: 'Database Tenaga Pendidik (Akademik)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan List Database Guru (Fault Isolation)',
        description: 'Membungkus list utama guru dengan Error Boundary sehingga kegagalan parsing file excel atau data API tidak mematikan fitur sidebar, menu, atau navigasi.',
        status: 'VERIFIED',
        details: 'GuruList terbungkus di dalam InfraErrorBoundary.'
      },
      {
        id: 'network_fallback',
        name: 'Penanganan API & Fallback Recovery',
        description: 'Mengintegrasikan loading data stats dengan fallback kueri terisolasi agar saat data statistik gagal, UI lainnya tetap berjalan.',
        status: 'VERIFIED',
        details: 'Kueri REST terisolasi & stats loader adaptif.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Rekayasa Sumber (Code Splitting / Lazy)',
        description: 'Pemisahan bundel JS berat secara asinkron untuk modal input GuruForm dan ExcelImportModal guna menghemat initial load.',
        status: 'VERIFIED',
        details: 'Dialog modal form terintegrasi dengan Suspense Lazy loading.'
      },
      {
        id: 'architectural_table_pagination',
        name: 'Standarisasi Pagination Tabel',
        description: 'Mewajibkan implementasi pagination pada setiap komponen Tabel.',
        status: 'VERIFIED',
        details: 'Pagination terdeteksi pada GuruList.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Responsive Guide)',
        description: 'Mewajibkan adanya properti instruction pada layout.',
        status: 'VERIFIED',
        details: 'Properti instruction terdeteksi.'
      },
      {
        id: 'architectural_toolbar_standard',
        name: 'Standarisasi Toolbar Halaman',
        description: 'Mewajibkan penggunaan properti toolbar pada layout.',
        status: 'VERIFIED',
        details: 'Toolbar terdeteksi.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan trigger mutation dimemosisasi dengan useMemo dan useCallback untuk meredam pemuatan ulang DOM berlebihan.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada modal handlers & stats.'
      }
    ]
  },
  academic_kelas: {
    moduleName: 'academic_kelas',
    displayName: 'Database Master Kelas (Akademik)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan List Database Kelas (Fault Isolation)',
        description: 'Membungkus list utama kelas dengan Error Boundary sehingga kegagalan parsing file excel atau data API tidak mematikan fitur sidebar, menu, atau navigasi.',
        status: 'VERIFIED',
        details: 'KelasList terbungkus di dalam InfraErrorBoundary.'
      },
      {
        id: 'network_fallback',
        name: 'Penanganan API & Fallback Recovery',
        description: 'Mengintegrasikan loading data stats dengan fallback kueri terisolasi agar saat data statistik gagal, UI lainnya tetap berjalan.',
        status: 'VERIFIED',
        details: 'Kueri REST terisolasi & stats loader adaptif.'
      },
      {
        id: 'architectural_table_pagination',
        name: 'Standarisasi Pagination Tabel',
        description: 'Mewajibkan implementasi pagination pada setiap komponen Tabel.',
        status: 'VERIFIED',
        details: 'Pagination terdeteksi pada KelasList.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Instruction Prop)',
        description: 'Mewajibkan adanya properti instruction pada layout.',
        status: 'VERIFIED',
        details: 'Properti instruction terdeteksi.'
      },
      {
        id: 'architectural_toolbar_standard',
        name: 'Standarisasi Toolbar Halaman',
        description: 'Mewajibkan penggunaan properti toolbar pada layout.',
        status: 'VERIFIED',
        details: 'Toolbar terdeteksi.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan trigger mutation dimemosisasi dengan useMemo dan useCallback untuk meredam pemuatan ulang DOM berlebihan.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada modal handlers & stats.'
      }
    ]
  },
  kesiswaan_monitoring: {
    moduleName: 'kesiswaan_monitoring',
    displayName: 'Dasbor Monitoring Kesiswaan',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kegagalan Dashboard Kesiswaan (Fault Isolation)',
        description: 'Membungkus dasbor kesiswaan dengan Error Boundary tingkat layout sehingga kegagalan render list pelanggaran atau kesalahan kueri tidak merusak navigasi utama.',
        status: 'VERIFIED',
        details: 'Dashboard terbungkus di dalam InfraErrorBoundary tingkat layout.'
      },
      {
        id: 'network_fallback',
        name: 'Toleransi Kueri REST & API Fallback',
        description: 'Mengamankan pengambilan data pelanggaran secara real-time via React Query dengan penanganan status loading yang aman.',
        status: 'VERIFIED',
        details: 'React Query cache + state loading skeletons.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Data pelanggaran harian, akumulasi poin, dan daftar spotlight siswa dibungkus useMemo untuk meredam pemuatan ulang DOM berlebihan.',
        status: 'VERIFIED',
        details: 'useMemo diintegrasikan pada stats dan daftar spotlight.'
      }
    ]
  },
  kesiswaan_jenis_pelanggaran: {
    moduleName: 'kesiswaan_jenis_pelanggaran',
    displayName: 'Referensi Jenis Pelanggaran (Kesiswaan)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation)',
        description: 'Melindungi antarmuka dari crash visual akibat API crash dengan membungkus tabel database utama dalam Error Boundary.',
        status: 'FAILED',
        details: 'Tabel utama JenisPelanggaran belum dibungkus di dalam ErrorBoundary.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Rekayasa Sumber (Code Splitting)',
        description: 'Memisahkan modal form asinkron untuk menghemat loading bundle awal.',
        status: 'FAILED',
        details: 'Modal Form input belum dipisah asinkron (lazy loaded).'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Pemanfaatan useMemo dan useCallback pada definisi columns, data, dan handlers.',
        status: 'WARNING',
        details: 'Columns dan callback handlers dideklarasikan ulang setiap re-render.'
      }
    ]
  },
  login: {
    moduleName: 'login',
    displayName: 'Modul Autentikasi & Login',
    standards: [
      {
        id: 'anti_double_submit',
        name: 'Anti Double-Submit (Button Debounce)',
        description: 'Mencegah spam klik login ganda saat status request sedang pending untuk menghindari overloading session generator.',
        status: 'VERIFIED',
        details: 'State blocking submit button & isPending handling active.'
      },
      {
        id: 'input_guards',
        name: 'Validasi Input Kebal Injeksi (Zod Schema)',
        description: 'Menyaring karakter berbahaya di sisi klien sebelum memukul endpoint API.',
        status: 'VERIFIED',
        details: 'Zod schema validation dengan feedback error interaktif.'
      },
      {
        id: 'oauth_fault_tolerance',
        name: 'Toleransi Kegagalan OAuth & Face API',
        description: 'Mengisolasi kegagalan integrasi Google login atau face recognition agar pengguna tetap dapat login menggunakan email manual.',
        status: 'VERIFIED',
        details: 'Form fallback layout terisolasi secara visual.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Sesi Cleanup & Token Security',
        description: 'Pembersihan token sesi dan data sensitif di memori klien saat logout untuk mencegah kebocoran sesi.',
        status: 'VERIFIED',
        details: 'Auth store memory reset + dynamic cookie clearance.'
      }
    ]
  },
  coop_products: {
    moduleName: 'coop_products',
    displayName: 'Katalog & Inventori Barang Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Render (Fault Isolation)',
        description: 'Mencegah visual crash halaman total melalui Error Boundary terisolasi saat menampilkan list data produk.',
        status: 'VERIFIED',
        details: 'Tabel produk dan form terisolasi secara aman.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Pembersihan Event Listener (Memory Leak Cleanups)',
        description: 'Membersihkan event listener barcode scanner pada window secara asinkron saat component unmount atau modal ditutup.',
        status: 'VERIFIED',
        details: 'Cleanup event listener window terpasang pada barcode handler.'
      }
    ]
  },
  coop_laporaninventori: {
    moduleName: 'coop_laporaninventori',
    displayName: 'Laporan Persediaan & Stok Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Laporan (Fault Isolation)',
        description: 'Mencegah kerusakan visual halaman saat kegagalan parsing ekspor file excel laporan persediaan.',
        status: 'VERIFIED',
        details: 'Fungsi ekspor XLS terbungkus dalam try-catch.'
      }
    ]
  },
  coop_productformmodal: {
    moduleName: 'coop_productformmodal',
    displayName: 'Modal Input Produk Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Form Modal (Fault Isolation)',
        description: 'Membungkus form modal dalam Suspense / Error Boundary terisolasi untuk menahan visual crash pada input data.',
        status: 'VERIFIED',
        details: 'Dialog Modal terbungkus asinkron.'
      }
    ]
  },
  coop_opnameformmodal: {
    moduleName: 'coop_opnameformmodal',
    displayName: 'Modal Input Sesi Opname Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Sesi Baru (Fault Isolation)',
        description: 'Mengisolasi inisialisasi sesi opname baru dari kegagalan transaksi database.',
        status: 'VERIFIED',
        details: 'Action mutasi terbungkus safely.'
      }
    ]
  },
  coop_opnamedetail: {
    moduleName: 'coop_opnamedetail',
    displayName: 'Detail Sesi Penyesuaian Stock Opname',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kalkulasi Selisih Fisik (Fault Isolation)',
        description: 'Menjaga antarmuka detail hitung fisik agar tidak crash jika terdapat selisih stok ekstrim.',
        status: 'VERIFIED',
        details: 'Kalkulasi selisih terisolasi di dalam useMemo.'
      }
    ]
  },
  coop_vouchers: {
    moduleName: 'coop_vouchers',
    displayName: 'Poin & Voucher Benefit Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation)',
        description: 'Mencegah visual crash halaman total melalui Error Boundary terisolasi saat mengelola voucher dan poin anggota.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      }
    ]
  },
  coop_pos: {
    moduleName: 'coop_pos',
    displayName: 'Kasir Digital (POS) Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation)',
        description: 'Mencegah visual crash halaman total melalui Error Boundary terisolasi pada panel POS kasir dan riwayat belanja.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Pembersihan Event Listener (Memory Leak Cleanups)',
        description: 'Membersihkan event listener barcode scanner global pada window saat component unmount.',
        status: 'VERIFIED',
        details: 'Cleanup event listener window terpasang pada keydown handler.'
      }
    ]
  },
  coop_savings: {
    moduleName: 'coop_savings',
    displayName: 'Manajemen Simpanan / Tabungan Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Render (Fault Isolation)',
        description: 'Mencegah visual crash halaman total melalui pembungkusan Layout & Error Boundary terisolasi saat menampilkan simpanan dan mutasi anggota.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Memoization)',
        description: 'Mengunci array simpanan, callback hander ekspor, dan definisi kolom tabel menggunakan useMemo dan useCallback untuk kestabilan render.',
        status: 'VERIFIED',
        details: 'useMemo & useCallback terintegrasi pada data lists & columns.'
      }
    ]
  },
  coop_accounting: {
    moduleName: 'coop_accounting',
    displayName: 'Keuangan & Akuntansi Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah visual crash halaman total melalui pembungkusan Layout & Error Boundary terisolasi saat menampilkan jurnal, neraca, dan potongan gaji.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Pencegahan Kebocoran Memori (Timer Cleanup)',
        description: 'Membersihkan handle timer cetak dokumen potongan gaji secara asinkron saat unmount.',
        status: 'VERIFIED',
        details: 'Cleanup clearTimeout terpasang pada unmount effect hook.'
      }
    ]
  },
  coop_settings: {
    moduleName: 'coop_settings',
    displayName: 'Pengaturan Koperasi',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah visual crash halaman total melalui pembungkusan Layout & Error Boundary terisolasi.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Tab-Level Code Splitting)',
        description: 'Memecah JS bundle subkomponen modal dan formulir menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'Subkomponen form, preview, table, dan modal dimuat secara lazy loading.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada modal handlers, dropdown, dan form.'
      }
    ]
  },
  hubin_penempatan_pkl: {
    moduleName: 'hubin_penempatan_pkl',
    displayName: 'Penempatan PKL (Hubin)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Code Splitting / lazy)',
        description: 'Memecah JS bundle modal input, nilai, kunjungan, dan review jurnal menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'Dialog modal plotting, nilai, kunjungan, dan review jurnal dimuat secara lazy loading.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada modal handlers dan tabel.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Pencegahan Kebocoran Memori (Timer/Listener Cleanup)',
        description: 'Membersihkan event listener atau timer secara asinkron saat unmount.',
        status: 'VERIFIED',
        details: 'Cleanup handlers terpasang pada unmount effect hook.'
      }
    ]
  },
  hubin_absensi_pkl: {
    moduleName: 'hubin_absensi_pkl',
    displayName: 'Absensi PKL (Hubin)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Code Splitting / lazy)',
        description: 'Memecah JS bundle subkomponen visualisasi monitoring dan formulir edit logbook menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'Subkomponen HubinStudentView, HubinManagementView, HubinLogbookEditModal, HubinPrintJurnalPkl dimuat secara lazy loading.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada status, history lists, and tabs.'
      },
      {
        id: 'memory_leak_safeguards',
        name: 'Pencegahan Kebocoran Memori (Timer/Listener Cleanup)',
        description: 'Membersihkan event listener geolocation watchPosition secara asinkron saat unmount.',
        status: 'VERIFIED',
        details: 'Cleanup navigator geolocation watchPosition terpasang pada unmount effect hook.'
      }
    ]
  },
  attendance_ops: {
    moduleName: 'attendance_ops',
    displayName: 'Operasional Presensi Gerbang (POS & RFID Scanner)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / AttendanceErrorBoundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri untuk scanner dan POS.',
        status: 'VERIFIED',
        details: 'AttendanceErrorBoundary & OperationalPageLayout terintegrasi.'
      },
      {
        id: 'realtime_socket_resilience',
        name: 'Ketahanan Socket Real-time & Re-connection',
        description: 'Menjaga konektivitas WebSocket room tenant dan auto-reconnect saat perpindahan tab atau mikro-disrupsi jaringan.',
        status: 'VERIFIED',
        details: 'WebSocket tenant room join & event listeners terpasang.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis Scanner (Lazy Loading ZXing)',
        description: 'Memecah JS bundle scanner QR/Barcode berat (ZXing 400KB+) secara dinamis menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'GateInputModule dynamically lazy-loaded.'
      },
      {
        id: 'scanner_deduplication',
        name: 'Pencegahan Tap Ganda / Burst Scanner',
        description: 'Mekanisme deduplikasi ref time-window 1.5 detik untuk mencegah double beeping dan duplicate toast notifications dari HID scanner.',
        status: 'VERIFIED',
        details: 'processingTapRef deduplication lock active.'
      }
    ]
  },
  attendance_monitoring_kbm: {
    moduleName: 'attendance_monitoring_kbm',
    displayName: 'Monitoring KBM (Kehadiran)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada breadcrumbs dan data handler.'
      }
    ]
  },
  sarpras_dashboard: {
    moduleName: 'sarpras_dashboard',
    displayName: 'Dashboard Toolman Aset (Sarpras)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada statCards dan data handler.'
      }
    ]
  },
  sarpras_inventory: {
    moduleName: 'sarpras_inventory',
    displayName: 'Inventaris Aset (Sarpras)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada breadcrumbs dan data handler.'
      }
    ]
  },
  sarpras_loans: {
    moduleName: 'sarpras_loans',
    displayName: 'Peminjaman Aset (Sarpras)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada columns dan statusButtons.'
      }
    ]
  },
  sarpras_maintenance: {
    moduleName: 'sarpras_maintenance',
    displayName: 'Pemeliharaan Aset (Sarpras)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total (white screen of death) melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada columns dan statusButtons.'
      }
    ]
  },
  billing_service_center: {
    moduleName: 'billing_service_center',
    displayName: 'Pusat Layanan Sekolah (Billing)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Halaman (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam AcademicPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, list layanan, dan callback handlers dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada data lists dan click handlers.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Code Splitting / lazy)',
        description: 'Memecah JS bundle subkomponen berat menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'Subkomponen BillingInvoicesSection, OrderReviewSidebar, dan AutoRenewModal dimuat secara lazy loading.'
      }
    ]
  },
  superadmin_revenue_dashboard: {
    moduleName: 'superadmin_revenue_dashboard',
    displayName: 'Revenue Dashboard Platform (Superadmin)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam SuperAdminPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, list kontributor, dan callbacks dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada data lists dan click handlers.'
      }
    ]
  },
  superadmin_billing_dashboard: {
    moduleName: 'superadmin_billing_dashboard',
    displayName: 'Billing Dashboard Platform (Superadmin)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam SuperAdminPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, list notifikasi, dan callbacks dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada data lists dan click handlers.'
      }
    ]
  },
  superadmin_plans: {
    moduleName: 'superadmin_plans',
    displayName: 'Manajemen Paket Layanan (Plans)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan React Error Boundary mandiri.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam SuperAdminPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, list plans, dan callbacks dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada data lists dan click handlers.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Code Splitting / lazy)',
        description: 'Memecah JS bundle subkomponen modal/form berat menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'PlanFormModal dimuat secara lazy loading.'
      }
    ]
  },
  superadmin_subscriptions: {
    moduleName: 'superadmin_subscriptions',
    displayName: 'Manajemen Langganan Tenant (Subscriptions)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan React Error Boundary mandiri di SuperAdminPageLayout.',
        status: 'VERIFIED',
        details: 'Halaman terbungkus di dalam SuperAdminPageLayout & ErrorBoundary.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, kolom tabel, stats, dan callbacks dimemosisasi dengan useMemo dan useCallback untuk meredam pemuatan ulang DOM berlebihan.',
        status: 'VERIFIED',
        details: 'useCallback & useMemo terintegrasi pada columns, filteredItems, paginatedItems, dan saHeaderStats.'
      },
      {
        id: 'code_splitting',
        name: 'Pemisahan Kode Dinamis (Code Splitting / lazy)',
        description: 'Memecah JS bundle subkomponen modal berat (Edit, Create, History) menggunakan React.lazy & Suspense.',
        status: 'VERIFIED',
        details: 'SubscriptionEditModal, SubscriptionCreateModal, SubscriptionHistoryModal dimuat secara lazy loading.'
      },
      {
        id: 'architectural_table_pagination',
        name: 'Standarisasi Pagination Tabel',
        description: 'Mewajibkan implementasi pagination pada setiap komponen Tabel untuk mencegah memory leak dan beban DOM berat.',
        status: 'VERIFIED',
        details: 'Pagination terdeteksi pada tabel subscription dengan currentPage, totalPages, onPageChange, onLimitChange.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Responsive Guide)',
        description: 'Mewajibkan adanya properti instruction pada layout untuk memberikan panduan penggunaan fitur kepada pengguna.',
        status: 'VERIFIED',
        details: 'Properti instruction terdeteksi pada SuperAdminPageLayout.'
      },
      {
        id: 'architectural_table_toolbar_standard',
        name: 'Standarisasi Toolbar Kontekstual Tabel',
        description: 'Mewajibkan penggunaan properti toolbarRight pada komponen Table untuk aksi kontekstual seperti tombol Buat Langganan.',
        status: 'VERIFIED',
        details: 'Toolbar operasional (Buat Langganan) terintegrasi dalam slot resmi Table toolbarRight.'
      }
    ]
  },
  staffactivitylogpage: {
    moduleName: 'staffactivitylogpage',
    displayName: 'Log Aktivitas Staf (Staff Activity Log)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan (Fault Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan AcademicPageLayout & ErrorBoundary.',
        status: 'VERIFIED',
        details: 'Halaman menggunakan AcademicPageLayout sebagai Error Boundary standar.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Stats kartu analitik dan data log dimemosisasi dengan useMemo untuk mencegah kalkulasi ulang berlebihan.',
        status: 'VERIFIED',
        details: 'useMemo diterapkan pada stats analitik dan useCallback pada fetchLogs & handleResetFilters.'
      },
      {
        id: 'fault_tolerance_type_safety',
        name: 'Keamanan Tipe Data (Type Safety)',
        description: 'Menghilangkan penggunaan tipe data longgar ": any" untuk memperkuat kontrak tipe TypeScript.',
        status: 'VERIFIED',
        details: 'Semua parameter catch block dan variabel diubah dari ": any" ke tipe eksplisit.'
      },
      {
        id: 'accessibility_form',
        name: 'Aksesibilitas Form (ARIA & Labels)',
        description: 'Elemen form (<input>, <select>) memiliki aria-label atau htmlFor yang sesuai standar aksesibilitas.',
        status: 'VERIFIED',
        details: 'Semua select dan input filter dilengkapi aria-label dan id yang deskriptif.'
      },
      {
        id: 'defensive_map',
        name: 'Pemetaan Data Defensif (Safe Map)',
        description: 'Semua pemanggilan .map() pada data asinkron menggunakan operator optional ?.map() untuk mencegah crash rendering.',
        status: 'VERIFIED',
        details: 'Semua .map() pada logs dan staffUsers diubah ke ?.map() yang aman.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Instruction)',
        description: 'Mewajibkan properti instruction pada layout untuk memberikan panduan penggunaan fitur kepada pengguna.',
        status: 'VERIFIED',
        details: 'Properti instruction ter-useMemo dengan 4 tips panduan dipasang pada AcademicPageLayout.'
      },
      {
        id: 'architectural_breadcrumbs',
        name: 'Navigasi Breadcrumbs Kontekstual',
        description: 'Mewajibkan properti breadcrumbs pada layout agar pengguna mengetahui posisi navigasinya dalam hierarki halaman.',
        status: 'VERIFIED',
        details: 'Breadcrumbs [Akademik → Log Aktivitas Staf] ter-useMemo dipasang pada AcademicPageLayout.'
      },
      {
        id: 'architectural_searchable_select',
        name: 'Standarisasi Dropdown SearchableSelect',
        description: 'Mengganti elemen <select> native dengan SearchableSelect terstandarisasi untuk UX dropdown yang lebih baik.',
        status: 'VERIFIED',
        details: 'Dropdown Petugas/Staf dan Jenis Aksi diganti menggunakan komponen SearchableSelect.'
      }
    ]
  },
  attendance_anggota_eskul: {
    moduleName: 'attendance_anggota_eskul',
    displayName: 'Manajemen Anggota & Pembina Eskul (Kesiswaan)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Halaman (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan AcademicPageLayout & ErrorBoundary.',
        status: 'VERIFIED',
        details: 'Halaman menggunakan AcademicPageLayout sebagai Error Boundary standar.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Penyaringan data, visualisasi, dan callback dimemosisasi dengan useMemo dan useCallback.',
        status: 'VERIFIED',
        details: 'useCallback dan useMemo terintegrasi pada data handler.'
      },
      {
        id: 'architectural_searchable_select',
        name: 'Standarisasi Dropdown SearchableSelect',
        description: 'Menggunakan SearchableSelect terstandarisasi untuk memilih guru pembina.',
        status: 'VERIFIED',
        details: 'Dropdown pemilihan guru di modal tambah manual diganti dengan SearchableSelect.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Instruction)',
        description: 'Mewajibkan adanya properti instruction pada layout untuk memberikan panduan penggunaan fitur kepada pengguna.',
        status: 'VERIFIED',
        details: 'Properti instruction ter-useMemo dengan tips panduan dipasang pada AcademicPageLayout.'
      },
      {
        id: 'architectural_breadcrumbs',
        name: 'Navigasi Breadcrumbs Kontekstual',
        description: 'Mewajibkan properti breadcrumbs pada layout agar pengguna mengetahui posisi navigasinya dalam hierarki halaman.',
        status: 'VERIFIED',
        details: 'Breadcrumbs [Kesiswaan → Anggota & Pembina Eskul] ter-useMemo dipasang pada AcademicPageLayout.'
      }
    ]
  },
  attendance_jadwal_kegiatan: {
    moduleName: 'attendance_jadwal_kegiatan',
    displayName: 'Jadwal Kegiatan Rutin (Kesiswaan)',
    standards: [
      {
        id: 'fault_tolerance',
        name: 'Isolasi Kesalahan Halaman (Fault Isolation / Error Boundary)',
        description: 'Mencegah kerusakan visual halaman total melalui pembungkusan AcademicPageLayout & ErrorBoundary.',
        status: 'VERIFIED',
        details: 'Halaman menggunakan AcademicPageLayout sebagai Error Boundary standar.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (Render Optimization)',
        description: 'Komputasi kartu jadwal, breadcrumbs, dan instruction panel dimemosisasi dengan useMemo.',
        status: 'VERIFIED',
        details: 'useMemo terintegrasi pada komputasi cards, breadcrumbs, dan instruction panel.'
      },
      {
        id: 'architectural_user_guidance',
        name: 'Sistem Panduan Pengguna (Instruction)',
        description: 'Mewajibkan adanya properti instruction pada layout untuk memberikan panduan penggunaan fitur kepada pengguna.',
        status: 'VERIFIED',
        details: 'Properti instruction ter-useMemo dengan tips panduan, termasuk info auto-session, dipasang pada AcademicPageLayout.'
      },
      {
        id: 'architectural_breadcrumbs',
        name: 'Navigasi Breadcrumbs Kontekstual',
        description: 'Mewajibkan properti breadcrumbs pada layout agar pengguna mengetahui posisi navigasinya dalam hierarki halaman.',
        status: 'VERIFIED',
        details: 'Breadcrumbs [Kesiswaan → Jadwal Kegiatan Rutin] ter-useMemo dipasang pada AcademicPageLayout.'
      },
      {
        id: 'architectural_layout_standard',
        name: 'Standardisasi Layout Utama (AcademicPageLayout)',
        description: 'Memverifikasi apakah halaman menggunakan pembungkus AcademicPageLayout yang terstandar.',
        status: 'VERIFIED',
        details: 'JadwalKegiatanPage.tsx telah direfactor menggunakan AcademicPageLayout dengan title, breadcrumbs, instruction, dan hardeningModuleKey.'
      },
      {
        id: 'standard_action_button',
        name: 'Standarisasi Tombol Aksi (Button Component)',
        description: 'Menggunakan komponen Button terstandarisasi untuk aksi utama halaman.',
        status: 'VERIFIED',
        details: 'Tombol Tambah Jadwal dan aksi di modal form menggunakan komponen Button standar dari @/components/ui.'
      },
      {
        id: 'empty_state_handling',
        name: 'Penanganan Empty State',
        description: 'Halaman menampilkan status kosong yang informatif ketika belum ada data jadwal.',
        status: 'VERIFIED',
        details: 'Empty state dengan ikon Calendar, judul, dan deskripsi ditampilkan saat daftar jadwal kosong.'
      }
    ]
  },
  jam_kbm_page: {
    moduleName: 'jam_kbm_page',
    displayName: 'Konfigurasi Jam KBM & Shift (Kurikulum)',
    standards: [
      {
        id: 'architectural_layout_standard',
        name: 'Standardisasi Layout Utama (AcademicPageLayout)',
        description: 'Memverifikasi apakah halaman menggunakan pembungkus AcademicPageLayout yang terstandar.',
        status: 'VERIFIED',
        details: 'JamKBMPage.tsx menggunakan AcademicPageLayout dengan title, breadcrumbs, instruction, toolbar, dan hardeningModuleKey.'
      },
      {
        id: 'god_file_guard',
        name: 'God File Prevention (Dekomposisi Subkomponent)',
        description: 'Memecah berkas halaman >800 baris menjadi subkomponent terpisah yang dapat diuji dan dimuat secara lazy.',
        status: 'VERIFIED',
        details: 'Berkas asli 921 baris dipecah menjadi 3 modul: JamKBMTypes.ts, JamKBMShiftPanel.tsx (<350 baris), JamKBMClassAssignmentPanel.tsx (<100 baris), dan JamKBMPage.tsx (<250 baris). Semua subkomponent disimpan di src/components/kurikulum/jam-kbm/.'
      },
      {
        id: 'dom_churn_protection',
        name: 'Optimasi DOM Churn (useMemo + useCallback)',
        description: 'Komputasi data berat dan event handler dimemoisasi untuk mencegah re-render tidak perlu.',
        status: 'VERIFIED',
        details: 'fetchTenant dibungkus useCallback; breadcrumbs & instruction di-useMemo; seluruh handler di JamKBMShiftPanel menggunakan useCallback; currentShift & parsed di-useMemo.'
      },
      {
        id: 'no_any_type',
        name: 'Keamanan Tipe TypeScript (No any)',
        description: 'Menghilangkan seluruh penggunaan tipe data longgar ": any" dan menggantinya dengan tipe eksplisit.',
        status: 'VERIFIED',
        details: 'Semua tipe any diganti: kelasList: KelasOption[], shiftConfig: ShiftConfig, ShiftItem, TimeSlot, BreakItem — semua didefinisikan di JamKBMTypes.ts. err: unknown pattern diterapkan di semua catch block.'
      },
      {
        id: 'zod_validation_guard',
        name: 'Zod Schema Validation Guard',
        description: 'Validasi data form melalui Zod safeParse() sebelum dikirim ke API — defense-in-depth.',
        status: 'VERIFIED',
        details: 'shiftConfigSchema.safeParse(shiftConfig) dijalankan di handleSave() sebelum memanggil updateTenant(). Schema mencakup timeSlotSchema, breakItemSchema, dan shiftItemSchema dengan constraint waktu, nama, dan durasi yang riil.'
      },
      {
        id: 'form_a11y',
        name: 'Aksesibilitas Form (aria-label / htmlFor)',
        description: 'Seluruh elemen form dilengkapi aria-label dan id yang sesuai standar aksesibilitas web.',
        status: 'VERIFIED',
        details: 'Input nama shift, jam mulai, durasi, input waktu slot, input durasi istirahat, tombol sisipkan/hapus istirahat — semua dilengkapi aria-label. Tab buttons dilengkapi role="tab" dan aria-selected.'
      },
      {
        id: 'architectural_searchable_select',
        name: 'Standarisasi Dropdown SearchableSelect',
        description: 'Mengganti elemen <select> native dengan SearchableSelect terstandarisasi.',
        status: 'VERIFIED',
        details: 'Dropdown Pilih Shift di toolbar dan dropdown penugasan shift per kelas di JamKBMClassAssignmentPanel menggunakan komponen SearchableSelect.'
      },
      {
        id: 'lazy_suspense_loading',
        name: 'Lazy Loading Subkomponent Berat (lazy + Suspense)',
        description: 'Subkomponent panel berat dimuat on-demand menggunakan React.lazy() dan Suspense untuk mengurangi bundle awal.',
        status: 'VERIFIED',
        details: 'JamKBMShiftPanel dan JamKBMClassAssignmentPanel di-lazy() import di JamKBMPage.tsx dan dibungkus <Suspense fallback={<PanelLoader />}>. Bundle hanya dimuat ketika tab pertama kali dikunjungi.'
      },
      {
        id: 'shared_tabular_standard',
        name: 'Standardisasi Komponen Tabular Baru',
        description: 'Mengintegrasikan komponen tabel shared Tabular yang dimodernisasi dari eskul page untuk penayangan data roster / list.',
        status: 'VERIFIED',
        details: 'Tabel penugasan kelas-kelas kini menggunakan komponen shared Tabular.tsx dengan view switcher (Diagram vs Tabel).'
      }
    ]
  }
};


export const getHardeningConfig = (moduleKey: string): ModuleHardeningConfig => {
  const baseConfig = HARDENING_REGISTRY[moduleKey] || {
    moduleName: String(moduleKey),
    displayName: String(moduleKey),
    standards: []
  };

  // Clone config to avoid mutation of frozen objects
  const config: ModuleHardeningConfig = {
    ...baseConfig,
    standards: [] // We override or append. To keep manual specs, we append them, or we can merge! Let's clean the array to show the dynamic automated checks first, then manual!
  };

  // Inject static code analysis findings dynamically
  const auditData = (auditReport as any)[moduleKey];
  if (auditData) {
    // 1. Audit Kriteria: Standardisasi Layout Utama (Layout Standard Guard)
    config.standards.push({
      id: 'architectural_layout_standard',
      name: 'Standardisasi Layout Utama (Academic & Operational Layout Guard)',
      description: 'Memverifikasi apakah halaman menggunakan pembungkus AcademicPageLayout (Manajemen dengan Sidebar) atau OperationalPageLayout (Operasional POS Mode TANPA Sidebar) yang terstandar.',
      status: auditData.usesLayout ? 'VERIFIED' : 'FAILED',
      details: auditData.usesLayout 
        ? `Tervalidasi: Halaman dibungkus dengan ${auditData.usesOperationalLayout ? 'OperationalPageLayout (POS Mode TANPA Sidebar)' : 'AcademicPageLayout (Dengan Sidebar)'} (${auditData.filename}).` 
        : `Gagal: File ${auditData.filename} tidak menggunakan Layout terstandar.`
    });

    // 2. Audit Kriteria: Shared UI Components
    config.standards.push({
      id: 'architectural_shared_components',
      name: 'Standardisasi Shared UI Components',
      description: 'Memverifikasi apakah halaman mengimpor komponen bersama dari folder ui untuk mencegah redudansi visual.',
      status: auditData.usesUiComponents ? 'VERIFIED' : 'FAILED',
      details: auditData.usesUiComponents 
        ? 'Tervalidasi: Mengimpor shared UI components terstandar.' 
        : 'Gagal: Halaman ini menggunakan elemen HTML mentah atau belum mengimpor standard UI.'
    });

    // 3. Audit Kriteria: Defensive Array Mapping Protection (Pencegahan Crash rendering)
    config.standards.push({
      id: 'architectural_safe_mapping',
      name: 'Keamanan Pemetaan Array (.map Chaining Protection)',
      description: 'Memverifikasi apakah perulangan data array menggunakan chaining pengaman (?.) untuk mencegah crash jika data kosong.',
      status: auditData.safeMapping ? 'VERIFIED' : 'FAILED',
      details: auditData.safeMapping
        ? 'Tervalidasi: Semua fungsi perulangan .map menggunakan pertahanan opsional ?.'
        : 'Gagal: Menggunakan .map secara mentah tanpa opsional chaining ?., berisiko crash rendering jika data kosong.'
    });

    // 4. Audit Kriteria: DOM Churn Protection (useMemo/useCallback)
    config.standards.push({
      id: 'architectural_memoization',
      name: 'Optimasi DOM Churn (useMemo & useCallback)',
      description: 'Memverifikasi apakah data, fungsi handle, dan columns dibungkus useMemo/useCallback untuk kestabilan rendering.',
      status: auditData.usesMemo ? 'VERIFIED' : 'WARNING',
      details: auditData.usesMemo
        ? 'Tervalidasi: Fungsi callback dan data columns dikunci aman lewat React Memoization.'
        : 'Peringatan: Tidak mendeteksi hook useMemo/useCallback. Variabel berisiko ter-recreate setiap re-render.'
    });

    // 5. Audit Kriteria: Strict Type Checking (No Loose Any Type)
    config.standards.push({
      id: 'architectural_strict_typing',
      name: 'Keamanan Tipe TypeScript (Anti Loose ": any")',
      description: 'Memverifikasi apakah halaman mematuhi standar pengetikan ketat dan tidak menggunakan tipe longgar ": any".',
      status: auditData.noAnyType ? 'VERIFIED' : 'WARNING',
      details: auditData.noAnyType
        ? 'Tervalidasi: Bersih total dari tipe data longgar ": any".'
        : 'Peringatan: Terdeteksi penggunaan tipe longgar ": any" di dalam baris kode sumber.'
    });

    // 6. Audit Kriteria: Strict Color Consistency Guard
    config.standards.push({
      id: 'architectural_strict_colors',
      name: 'Konsistensi Pewarnaan Desain (Strict Color Guard)',
      description: 'Memverifikasi apakah halaman mematuhi standardisasi warna terpusat dan bebas dari kode warna heksadesimal keras atau arbitrary Tailwind bracket colors.',
      status: auditData.strictColors ? 'VERIFIED' : 'WARNING',
      details: auditData.strictColors
        ? 'Tervalidasi: Konsisten 100% dengan palet warna terpusat dan bebas dari warna heksadesimal arbitrer.'
        : 'Peringatan: Terdeteksi penggunaan kode warna keras heksadesimal atau bracket [#[...]] Tailwind arbitrer.'
    });

    // 7. Audit Kriteria: Table Sorting Compliance
    config.standards.push({
      id: 'architectural_table_sorting',
      name: 'Kepatuhan Sorting Tabel (Table Sorting Compliance)',
      description: 'Memverifikasi apakah setiap komponen <Table> yang digunakan memiliki implementasi sorting kolom (sortable/onSort/sortKey).',
      status: auditData.tableSorting !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.tableSorting !== false
        ? 'Tervalidasi: Tabel memiliki props sorting yang terdefinisi.'
        : 'Peringatan: Komponen <Table> ditemukan tanpa implementasi sorting – pengalaman user tabel tidak lengkap.'
    });

    // 8. Audit Kriteria: Empty State Handler
    config.standards.push({
      id: 'architectural_empty_state',
      name: 'Penanganan State Kosong (Empty State Handler)',
      description: 'Memverifikasi apakah halaman yang melakukan fetch data memiliki tampilan fallback saat hasil data kosong.',
      status: auditData.emptyState !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.emptyState !== false
        ? 'Tervalidasi: Terdapat penanganan tampilan Empty State.'
        : 'Peringatan: Tidak ditemukan guard empty state – berisiko tampilan kosong tanpa pesan kepada pengguna.'
    });

    // 9. Audit Kriteria: Loading Skeleton Guard
    config.standards.push({
      id: 'architectural_loading_guard',
      name: 'Guard Indikator Loading (Skeleton / Spinner)',
      description: 'Memverifikasi apakah halaman yang melakukan fetch data menampilkan indikator loading/skeleton saat menunggu respons API.',
      status: auditData.loadingGuard !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.loadingGuard !== false
        ? 'Tervalidasi: Guard isLoading/Skeleton terpasang dengan benar.'
        : 'Peringatan: Tidak ditemukan Skeleton/isLoading guard – berisiko flash konten kosong sebelum data tiba.'
    });

    // 10. Audit Kriteria: Form Accessibility
    config.standards.push({
      id: 'architectural_form_a11y',
      name: 'Aksesibilitas Form (ARIA Label & htmlFor)',
      description: 'Memverifikasi apakah elemen form (<input>, <select>, <textarea>) memiliki atribut aksesibilitas aria-label atau htmlFor yang memadai.',
      status: auditData.formA11y !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.formA11y !== false
        ? 'Tervalidasi: Elemen form memiliki atribut aksesibilitas yang memadai.'
        : 'Peringatan: Input form ditemukan tanpa aria-label/htmlFor – melanggar standar aksesibilitas web (WCAG).'
    });

    // 11. Audit Kriteria: Performance & Code Splitting (Lazy/Suspense Guard)
    config.standards.push({
      id: 'architectural_performance_optimization',
      name: 'Optimasi Pemuatan (Lazy Loading & Suspense)',
      description: 'Memverifikasi apakah komponen berat seperti Modal, Form, atau Loader dimuat secara asinkron menggunakan lazy() & Suspense.',
      status: auditData.performanceOptimization !== false ? 'VERIFIED' : 'FAILED',
      details: auditData.performanceOptimization !== false
        ? 'Tervalidasi: Komponen berat dimuat secara asinkron (lazy) untuk mengoptimalkan bundle awal.'
        : 'Gagal: Komponen berat terdeteksi tetapi dimuat secara sinkron – beban bundle awal berat.'
    });

    // 12. Audit Kriteria: User Guidance System (Responsive Guide)
    config.standards.push({
      id: 'architectural_user_guidance',
      name: 'Sistem Panduan Pengguna (Responsive Guide)',
      description: 'Memverifikasi apakah halaman menyediakan sistem panduan kontekstual (Auto-open > 1366px).',
      status: auditData.userGuidance !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.userGuidance !== false
        ? 'Tervalidasi: Halaman menyediakan panduan instruksi kontekstual.'
        : 'Peringatan: Halaman tidak menyediakan panduan instruksi (instruction prop) pada layout.'
    });

    // 13. Audit Kriteria: Table Pagination Guard
    config.standards.push({
      id: 'architectural_table_pagination',
      name: 'Standarisasi Pagination Tabel',
      description: 'Memverifikasi apakah setiap komponen <Table> memiliki implementasi pagination untuk menangani dataset besar.',
      status: auditData.tablePagination !== false ? 'VERIFIED' : 'FAILED',
      details: auditData.tablePagination !== false
        ? 'Tervalidasi: Tabel memiliki implementasi pagination yang memadai.'
        : 'Gagal: Komponen <Table> ditemukan tanpa implementasi pagination – risiko out-of-memory.'
    });

    // 14. Audit Kriteria: Standardized Toolbar Guard
    config.standards.push({
      id: 'architectural_toolbar_standard',
      name: 'Standarisasi Toolbar Halaman',
      description: 'Memverifikasi apakah aksi utama halaman menggunakan properti toolbar pada layout.',
      status: auditData.standardToolbar !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.standardToolbar !== false
        ? 'Tervalidasi: Aksi utama menggunakan properti toolbar layout.'
        : 'Peringatan: Aksi utama terdeteksi tetapi tidak menggunakan properti toolbar layout.'
    });

    // 15. Audit Kriteria: Modern Feedback System
    config.standards.push({
      id: 'architectural_feedback_standard',
      name: 'Sistem Feedback & Dialog Modern',
      description: 'Memverifikasi penggunaan useToast, useConfirm, dan Modal terstandar.',
      status: auditData.standardFeedback !== false ? 'VERIFIED' : 'FAILED',
      details: auditData.standardFeedback !== false
        ? 'Tervalidasi: Menggunakan sistem feedback modern.'
        : 'Gagal: Masih menggunakan alert/confirm bawaan browser.'
    });

    // 16. Audit Kriteria: UI Container Consistency
    config.standards.push({
      id: 'architectural_container_consistency',
      name: 'Konsistensi Kontainer UI',
      description: 'Memverifikasi penggunaan SectionCard atau Card sebagai kontainer konten.',
      status: auditData.standardContainer !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.standardContainer !== false
        ? 'Tervalidasi: Menggunakan kontainer UI terstandar.'
        : 'Peringatan: Layout belum menggunakan SectionCard atau Card.'
    });

    // 17. Audit Kriteria: Advanced Selection Guard
    config.standards.push({
      id: 'architectural_advanced_select',
      name: 'Komponen Seleksi Canggih (SearchableSelect)',
      description: 'Memverifikasi penggunaan SearchableSelect untuk input pilihan.',
      status: auditData.advancedSelect !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.advancedSelect !== false
        ? 'Tervalidasi: Menggunakan SearchableSelect untuk input pilihan.'
        : 'Peringatan: Ditemukan dropdown yang belum menggunakan SearchableSelect.'
    });

    // 18. Audit Kriteria: Table Contextual Toolbar Guard
    config.standards.push({
      id: 'architectural_table_toolbar_standard',
      name: 'Standarisasi Toolbar Kontekstual Tabel',
      description: 'Memverifikasi penggunaan properti toolbarLeft/Right pada komponen Table.',
      status: auditData.tableToolbar !== false ? 'VERIFIED' : 'FAILED',
      details: auditData.tableToolbar !== false
        ? 'Tervalidasi: Aksi operasional tabel menggunakan slot toolbar resmi.'
        : 'Gagal: Aksi operasional tabel diletakkan di luar slot resmi toolbar Table.'
    });

    // 19. Audit Kriteria: Breadcrumb Navigation Guard
    config.standards.push({
      id: 'architectural_breadcrumb_navigation',
      name: 'Standarisasi Navigasi Breadcrumb',
      description: 'Memverifikasi apakah halaman menyediakan navigasi breadcrumb untuk konteks lokasi pengguna.',
      status: auditData.breadcrumbNavigation !== false ? 'VERIFIED' : 'WARNING',
      details: auditData.breadcrumbNavigation !== false
        ? 'Tervalidasi: Navigasi Breadcrumb terdeteksi.'
        : 'Peringatan: Halaman tidak melampirkan properti breadcrumbs pada layout.'
    });

    // 20. Audit Kriteria: Premium Feature Gate Guard
    if (auditData.premiumFeatureGate !== undefined && auditData.premiumFeatureGate !== null) {
      config.standards.push({
        id: 'architectural_premium_gate',
        name: 'Proteksi Fitur Berbayar (PremiumFeatureGate)',
        description: 'Memverifikasi apakah halaman dari modul berbayar dilindungi oleh komponen PremiumFeatureGate.',
        status: auditData.premiumFeatureGate ? 'VERIFIED' : 'FAILED',
        details: auditData.premiumFeatureGate
          ? 'Tervalidasi: Halaman dilindungi oleh gerbang lisensi PremiumFeatureGate.'
          : 'Gagal: Halaman ini berada di bawah modul berbayar tetapi belum dipasangi komponen PremiumFeatureGate.'
      });
    }

    // 21. Audit Kriteria: Pencegahan God File (Ukuran File Maksimum)
    if (auditData.godFileGuard !== undefined && auditData.godFileGuard !== null) {
      config.standards.push({
        id: 'architectural_god_file',
        name: 'Pencegahan God File (Ukuran File Maksimum)',
        description: 'Memverifikasi apakah ukuran file tetap ringkas (halaman utama < 800 baris, subkomponen < 500 baris) untuk meminimalkan beban rendering dan mempermudah pemeliharaan.',
        status: auditData.godFileGuard ? 'VERIFIED' : 'WARNING',
        details: auditData.godFileGuard
          ? 'Tervalidasi: Ukuran berkas kode sumber ringkas dan terkelola secara modular.'
          : 'Peringatan: Berkas terlalu besar (God File). Disarankan untuk didekonsolidasi menjadi beberapa subkomponen.'
      });
    }

    // 22. Audit Kriteria: Desentralisasi Konfigurasi (Anti-Hardcoded)
    if (auditData.hardcodedConfig !== undefined && auditData.hardcodedConfig !== null) {
      config.standards.push({
        id: 'architectural_hardcoded_configs',
        name: 'Desentralisasi Konfigurasi (Anti-Hardcoded)',
        description: 'Memverifikasi apakah halaman bersih dari mock data lokal statis dan URL server keras (hardcoded). Konfigurasi harus dimuat via variabel lingkungan (.env) atau config terpusat.',
        status: auditData.hardcodedConfig ? 'VERIFIED' : 'FAILED',
        details: auditData.hardcodedConfig
          ? 'Tervalidasi: Bersih dari mock data statis lokal dan URL API ter-hardcode.'
          : 'Gagal: Terdeteksi data tiruan (mock) atau alamat API statis keras di dalam kode.'
      });
    }

    // 23. Audit Kriteria: Standarisasi Kartu Analitik/Statistik (AnalyticsCard Varian Premium)
    if (auditData.analyticsCardGuard !== undefined && auditData.analyticsCardGuard !== null) {
      config.standards.push({
        id: 'architectural_analytics_card',
        name: 'Standarisasi Kartu Analitik/Statistik (AnalyticsCard Varian Premium)',
        description: 'Memverifikasi apakah halaman menggunakan komponen AnalyticsCard terstandarisasi varian premium untuk menyajikan metrik/statistik, bukan custom stat card lokal.',
        status: auditData.analyticsCardGuard ? 'VERIFIED' : 'FAILED',
        details: auditData.analyticsCardGuard
          ? 'Tervalidasi: Menggunakan komponen AnalyticsCard terstandarisasi varian premium untuk visualisasi metrik.'
          : 'Gagal: Terdeteksi kartu statistik/analitik kustom lokal. Gunakan komponen AnalyticsCard terstandarisasi varian premium dari `@/components/ui/AnalyticsCard`.'
      });
    }

    // 24. Audit Kriteria: Standarisasi Impor & Ekspor Data (Import/Export Standard)
    if (auditData.importExportGuard !== undefined && auditData.importExportGuard !== null) {
      config.standards.push({
        id: 'architectural_import_export',
        name: 'Standarisasi Impor & Ekspor Data (Import/Export Standard)',
        description: 'Memverifikasi apakah fitur ekspor/impor data dilengkapi loading guard, try-catch wrapper, dan template unduhan menggunakan utilitas standar ter-style \'generateImportTemplate\' untuk menghindari double submit, silent crash, atau template klasik.',
        status: auditData.importExportGuard ? 'VERIFIED' : 'FAILED',
        details: auditData.importExportGuard
          ? 'Tervalidasi: Fitur impor/ekspor data aman terproteksi loading guard, penanganan kesalahan, dan template unduhan ter-style menggunakan \'generateImportTemplate\'.'
          : 'Gagal: Terdeteksi fitur ekspor/impor data tanpa loading guard (isExporting/loading), blok penanganan kesalahan (try-catch), atau template unduhan belum menggunakan utilitas standar ter-style \'generateImportTemplate\'.'
      });
    }

    // 25. Audit Kriteria: Standarisasi Sistem Ekspor PDF (Built-in PDF Template Guard)
    if (auditData.standardPdfPrint !== undefined && auditData.standardPdfPrint !== null) {
      config.standards.push({
        id: 'architectural_pdf_print',
        name: 'Standarisasi Sistem Ekspor PDF (Built-in PDF Template Guard)',
        description: 'Memverifikasi apakah ekspor PDF menggunakan modul cetak PDF terstandar di src/utils/print/ untuk menjaga konsistensi template kop surat resmi.',
        status: auditData.standardPdfPrint ? 'VERIFIED' : 'WARNING',
        details: auditData.standardPdfPrint
          ? 'Tervalidasi: Menggunakan modul cetak PDF terstandar.'
          : 'Peringatan: Mendeteksi ekspor PDF manual/mentah. Gunakan modul cetak PDF terstandar di \'src/utils/print/\'.'
      });
    }

    // 26. Audit Kriteria: Validasi Skema Zod untuk Form (Zod Schema Guard)
    if (auditData.zodValidationGuard !== undefined && auditData.zodValidationGuard !== null) {
      config.standards.push({
        id: 'architectural_zod_validation',
        name: 'Validasi Skema Zod untuk Form (Zod Schema Guard)',
        description: 'Memverifikasi apakah elemen form didukung oleh skema validasi Zod untuk mencegah input data kotor.',
        status: auditData.zodValidationGuard ? 'VERIFIED' : 'WARNING',
        details: auditData.zodValidationGuard
          ? 'Tervalidasi: Form dilindungi oleh skema validasi Zod.'
          : 'Peringatan: Terdeteksi elemen form input tanpa skema validasi Zod.'
      });
    }

    // 27. Audit Kriteria: Standarisasi Pemilih Tab (TabSwitcher Guard)
    if (auditData.standardTabSwitcher !== undefined && auditData.standardTabSwitcher !== null) {
      config.standards.push({
        id: 'architectural_tab_switcher',
        name: 'Standarisasi Pemilih Tab (TabSwitcher Guard)',
        description: 'Memverifikasi apakah halaman menggunakan komponen bersama TabSwitcher untuk pemilih tab guna keseragaman antarmuka.',
        status: auditData.standardTabSwitcher ? 'VERIFIED' : 'FAILED',
        details: auditData.standardTabSwitcher
          ? 'Tervalidasi: Navigasi tab menggunakan komponen standard TabSwitcher.'
          : 'Gagal: Terdeteksi tombol switcher manual atau TabsList. Wajib menggunakan komponen <TabSwitcher />.'
      });
    }

    // 28. Audit Kriteria: Konsistensi Aliran Tata Letak (Layout Flow Consistency Guard)
    if (auditData.layoutFlowConsistency !== undefined && auditData.layoutFlowConsistency !== null) {
      config.standards.push({
        id: 'architectural_layout_flow_consistency',
        name: 'Konsistensi Aliran Tata Letak (Layout Flow Consistency Guard)',
        description: 'Memverifikasi apakah urutan aliran penempatan komponen utama di dalam halaman sudah konsisten (misalnya, filter dan kartu statistik wajib diletakkan di atas tabel data).',
        status: auditData.layoutFlowConsistency ? 'VERIFIED' : 'WARNING',
        details: auditData.layoutFlowConsistency
          ? 'Tervalidasi: Aliran tata letak halaman konsisten dengan filter dan statistik berada di atas tabel data.'
          : 'Peringatan: Tata letak tidak konsisten. Terdeteksi komponen filter atau kartu statistik diletakkan di bawah tabel data master.'
      });
    }

    // 29. Audit Kriteria: Kesiapan Whitelabel & Dynamic Branding (White-label Readiness Guard)
    if (auditData.whitelabelBrandingGuard !== undefined && auditData.whitelabelBrandingGuard !== null) {
      config.standards.push({
        id: 'architectural_whitelabel_branding',
        name: 'Kesiapan Whitelabel & Dynamic Branding (White-label Readiness Guard)',
        description: 'Memverifikasi bahwa antarmuka bebas dari teks branding platform statis yang ter-hardcode dan siap untuk kustomisasi Whitelabel Dinas / Tenant.',
        status: auditData.whitelabelBrandingGuard ? 'VERIFIED' : 'WARNING',
        details: auditData.whitelabelBrandingGuard
          ? 'Tervalidasi: Antarmuka terbebas dari hardcode branding platform dan terintegrasi dengan profil dynamic tenant/systemConfig.'
          : 'Peringatan: Terdeteksi teks branding platform statis yang ter-hardcode (Pelanggaran Whitelabel Dinas). Petunjuk Perbaikan: (1) DILARANG KERAS menulis teks "Absenta.id" atau "Absenta" secara permanen di tag JSX. (2) Gunakan variabel dinamis {tenantName || systemConfig?.app_name || "Portal Sekolah"}. (3) Bungkus halaman dengan <AcademicPageLayout> atau <OperationalPageLayout>.'
      });
    }

    // 30. Audit Kriteria: Adaptabilitas Responsif Multi-Perangkat (Responsive Multi-Device Adaptation Guard)
    if (auditData.responsiveLayoutAdaptationGuard !== undefined && auditData.responsiveLayoutAdaptationGuard !== null) {
      config.standards.push({
        id: 'architectural_responsive_layout_adaptation',
        name: 'Adaptabilitas Responsif Multi-Perangkat (Responsive Multi-Device Adaptation Guard)',
        description: 'Memverifikasi bahwa antarmuka teradaptasi dengan sempurna di 3 tingkatan layar (Desktop, Tablet 768px, Mobile 360px), bebas dari tumbukan elemen topbar (dengan menyembunyikan badge status redundan di HP), kliping teks, menggunakan varian Mobile-Mini/Compact Premium pada Kartu Statistik HP, dan dilengkapi Touch-Scroll pada TabSwitcher.',
        status: auditData.responsiveLayoutAdaptationGuard ? 'VERIFIED' : 'FAILED',
        details: auditData.responsiveLayoutAdaptationGuard
          ? 'Tervalidasi: Antarmuka teradaptasi dengan sempurna di seluruh perangkat (Desktop, Tablet 768px, Mobile 360px) dengan Topbar Minimalis dan varian statistik Mobile-Mini tanpa tumbukan atau kliping.'
          : 'Gagal: Terdeteksi isu responsivitas antarmuka. Petunjuk Perbaikan: (1) Sembunyikan badge status redundan di HP (hidden sm:block) agar judul dapat 100% ruang lebar. (2) Gunakan touch-scroll overflow-x-auto pada TabSwitcher. (3) Berikan varian Mobile-Mini/Compact Premium (mobileCompact={true}) pada kartu statistik HP. (4) Pastikan min-w-0 pada form & input.'
      });
    }
  }

  // Append any specific hand-written functional standards from original registry
  baseConfig.standards.forEach(std => {
    // Avoid duplicating automated standards
    if (!['fault_tolerance', 'dom_churn_protection', 'code_splitting', 'network_fallback'].includes(std.id)) {
      config.standards.push(std);
    }
  });

  return config;
};
