export interface BillingPageConfig {
  title: string;
  subtitle: string;
  showOverview?: boolean;
  emptyMessage?: string;
  statusOptions?: Array<{ value: string; label: string; }>;
  tableTitle?: string;
  searchPlaceholder?: string;
}

export const BILLING_PAGE_CONFIG: Record<string, BillingPageConfig> = {
  billing: {
    title: "💰 Billing Management",
    subtitle: "Kelola dan pantau semua tagihan pelanggan",
    showOverview: true,
    tableTitle: "Daftar Tagihan",
    emptyMessage: "Belum ada tagihan yang dibuat",
    searchPlaceholder: "Cari berdasarkan invoice, tenant, atau jumlah...",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'DRAFT', label: 'Draft' },
      { value: 'SENT', label: 'Terkirim' },
      { value: 'PAID', label: 'Lunas' },
      { value: 'OVERDUE', label: 'Terlambat' },
      { value: 'CANCELLED', label: 'Dibatalkan' }
    ]
  },
  dashboard: {
    title: "📊 Billing Dashboard",
    subtitle: "Ringkasan lengkap aktivitas billing dan keuangan",
    showOverview: true,
    tableTitle: "Ringkasan Aktivitas",
    emptyMessage: "Belum ada data aktivitas billing"
  },
  invoices: {
    title: "🧾 Invoice Management",
    subtitle: "Kelola dan pantau semua invoice pelanggan",
    showOverview: false,
    tableTitle: "Daftar Invoice",
    emptyMessage: "Belum ada invoice yang dibuat",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'UNPAID', label: 'Belum Dibayar' },
      { value: 'PAID', label: 'Dibayar' },
      { value: 'OVERDUE', label: 'Terlambat' }
    ]
  },
  payments: {
    title: "💳 Payment Management", 
    subtitle: "Pantau dan kelola semua transaksi pembayaran",
    showOverview: false,
    tableTitle: "Daftar Pembayaran",
    emptyMessage: "Belum ada riwayat pembayaran",
    searchPlaceholder: "Cari berdasarkan ID, metode, atau jumlah...",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'PENDING', label: 'Menunggu Konfirmasi' },
      { value: 'PROCESSING', label: 'Diproses' },
      { value: 'SUCCESS', label: 'Berhasil' },
      { value: 'FAILED', label: 'Gagal' },
      { value: 'CANCELLED', label: 'Dibatalkan' },
      { value: 'EXPIRED', label: 'Kedaluwarsa' }
    ]
  },
  subscriptions: {
    title: "📋 Subscription Management",
    subtitle: "Kelola langganan dan paket pelanggan",
    showOverview: false,
    tableTitle: "Daftar Langganan",
    emptyMessage: "Belum ada langganan aktif",
    searchPlaceholder: "Cari berdasarkan tenant, plan, atau status...",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'ACTIVE', label: 'Aktif' },
      { value: 'TRIAL', label: 'Trial' },
      { value: 'PENDING_PAYMENT', label: 'Menunggu Pembayaran' },
      { value: 'SUSPENDED', label: 'Ditangguhkan' },
      { value: 'CANCELLED', label: 'Dibatalkan' },
      { value: 'EXPIRED', label: 'Kedaluwarsa' }
    ]
  },
  plans: {
    title: "📦 Plan Management",
    subtitle: "Kelola paket layanan dan harga",
    showOverview: false,
    tableTitle: "Daftar Paket",
    emptyMessage: "Belum ada paket yang dibuat",
    statusOptions: [
      { value: 'ACTIVE', label: 'Aktif' },
      { value: 'INACTIVE', label: 'Tidak Aktif' }
    ]
  },
  reports: {
    title: "📈 Financial Reports",
    subtitle: "Analisis mendalam tentang performa keuangan dan langganan",
    showOverview: false,
    tableTitle: "Data Laporan",
    emptyMessage: "Belum ada data laporan tersedia",
    statusOptions: [
      { value: 'ALL', label: 'Semua Periode' },
      { value: 'DAILY', label: 'Harian' },
      { value: 'WEEKLY', label: 'Mingguan' },
      { value: 'MONTHLY', label: 'Bulanan' },
      { value: 'YEARLY', label: 'Tahunan' }
    ]
  },
  settings: {
    title: "⚙️ Billing Settings",
    subtitle: "Konfigurasi pengaturan billing dan payment gateway",
    showOverview: false,
    tableTitle: "Pengaturan Sistem",
    emptyMessage: "Belum ada konfigurasi tersimpan"
  },
  monitoring: {
    title: "📡 System Monitoring",
    subtitle: "Pantau kesehatan sistem billing dan payment gateway",
    showOverview: false,
    tableTitle: "Status Sistem",
    emptyMessage: "Belum ada data monitoring tersedia"
  }
};
