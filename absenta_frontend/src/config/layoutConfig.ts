/**
 * Standardized Layout Configuration
 * Konfigurasi layout yang terstandardisasi untuk modul billing dan invoice
 * Memastikan konsistensi dalam struktur, styling, dan behavior
 */

import React from 'react';
import {
  BarChart3,
  FileText,
  Users,
  CreditCard,
  Settings,
  TrendingUp,
  DollarSign,
  Plus,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  Mail,
  FileDown
} from 'lucide-react';

import type { BaseTabItem, BaseMetricCard } from '../components/common/BaseLayout';

// ===== BILLING MODULE CONFIGURATION =====

export const billingTabItems: BaseTabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/billing/dashboard',
    icon: React.createElement(BarChart3, { size: 16 })
  },
  {
    key: 'plans',
    label: 'Plans',
    path: '/billing/plans',
    icon: React.createElement(Users, { size: 16 })
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    path: '/billing/subscriptions',
    icon: React.createElement(CreditCard, { size: 16 })
  },
  {
    key: 'invoices',
    label: 'Invoices',
    path: '/billing/invoices',
    icon: React.createElement(FileText, { size: 16 })
  },
  {
    key: 'billings',
    label: 'Billings',
    path: '/billing/billings',
    icon: React.createElement(FileText, { size: 16 })
  },
  {
    key: 'payments',
    label: 'Payments',
    path: '/billing/payments',
    icon: React.createElement(DollarSign, { size: 16 })
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/billing/reports',
    icon: React.createElement(TrendingUp, { size: 16 })
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/billing/settings',
    icon: React.createElement(Settings, { size: 16 })
  }
];

// ===== INVOICE MODULE CONFIGURATION =====

export const invoiceTabItems: BaseTabItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/invoice',
    icon: React.createElement(BarChart3, { size: 16 })
  },
  {
    key: 'invoices',
    label: 'Invoices',
    path: '/invoice/list',
    icon: React.createElement(FileText, { size: 16 })
  },
  {
    key: 'create',
    label: 'Create Invoice',
    path: '/invoice/create',
    icon: React.createElement(Plus, { size: 16 })
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/invoice/reports',
    icon: React.createElement(TrendingUp, { size: 16 })
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/invoice/settings',
    icon: React.createElement(Settings, { size: 16 })
  }
];

// ===== PAGE CONFIGURATION =====

export interface PageConfig {
  title: string;
  subtitle: string;
  showOverview?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  tableTitle?: string;
  statusOptions?: Array<{ value: string; label: string }>;
}

export const billingPageConfig: Record<string, PageConfig> = {
  dashboard: {
    title: "📊 Billing Dashboard",
    subtitle: "Ringkasan lengkap aktivitas billing dan keuangan",
    showOverview: true,
    emptyMessage: "Belum ada data aktivitas billing"
  },
  plans: {
    title: "📦 Plan Management",
    subtitle: "Kelola paket layanan dan harga",
    showOverview: false,
    tableTitle: "Daftar Paket",
    emptyMessage: "Belum ada paket yang dibuat",
    searchPlaceholder: "Cari paket berdasarkan nama atau deskripsi...",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'ACTIVE', label: 'Aktif' },
      { value: 'INACTIVE', label: 'Tidak Aktif' }
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
      { value: 'INACTIVE', label: 'Tidak Aktif' },
      { value: 'SUSPENDED', label: 'Ditangguhkan' },
      { value: 'CANCELLED', label: 'Dibatalkan' }
    ]
  },
  billing: {
    title: "💰 Billing Management",
    subtitle: "Kelola dan pantau semua tagihan pelanggan",
    showOverview: true,
    tableTitle: "Daftar Tagihan",
    emptyMessage: "Belum ada tagihan yang dibuat",
    searchPlaceholder: "Cari berdasarkan invoice, tenant, atau jumlah...",
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
    emptyMessage: "Belum ada transaksi pembayaran",
    searchPlaceholder: "Cari berdasarkan ID, metode, atau jumlah...",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'PAID', label: 'Berhasil' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'FAILED', label: 'Gagal' },
      { value: 'CANCELLED', label: 'Dibatalkan' }
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
  }
};

export const invoicePageConfig: Record<string, PageConfig> = {
  dashboard: {
    title: "📊 Invoice Dashboard",
    subtitle: "Ringkasan lengkap aktivitas invoice dan pembayaran",
    showOverview: true,
    emptyMessage: "Belum ada data aktivitas invoice"
  },
  list: {
    title: "🧾 Invoice Management",
    subtitle: "Kelola dan pantau semua invoice pelanggan",
    showOverview: false,
    tableTitle: "Daftar Invoice",
    emptyMessage: "Belum ada invoice yang dibuat",
    searchPlaceholder: "Cari berdasarkan nomor invoice, tenant, atau status...",
    statusOptions: [
      { value: 'ALL', label: 'Semua Status' },
      { value: 'DRAFT', label: 'Draft' },
      { value: 'SENT', label: 'Terkirim' },
      { value: 'PAID', label: 'Dibayar' },
      { value: 'OVERDUE', label: 'Terlambat' },
      { value: 'CANCELLED', label: 'Dibatalkan' }
    ]
  },
  create: {
    title: "➕ Create Invoice",
    subtitle: "Buat invoice baru untuk pelanggan",
    showOverview: false,
    emptyMessage: "Mulai dengan mengisi informasi invoice"
  },
  reports: {
    title: "📈 Invoice Reports",
    subtitle: "Analisis mendalam tentang performa invoice dan pembayaran",
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
    title: "⚙️ Invoice Settings",
    subtitle: "Konfigurasi pengaturan invoice dan template",
    showOverview: false,
    tableTitle: "Pengaturan Sistem",
    emptyMessage: "Belum ada konfigurasi tersimpan"
  }
};

// ===== STATUS CONFIGURATION =====

export const statusConfig = {
  billing: {
    PENDING: {
      label: 'Pending',
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      icon: React.createElement(Clock, { size: 14 })
    },
    PAID: {
      label: 'Paid',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
      icon: React.createElement(CheckCircle, { size: 14 })
    },
    OVERDUE: {
      label: 'Overdue',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: React.createElement(AlertCircle, { size: 14 })
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      icon: React.createElement(XCircle, { size: 14 })
    }
  },
  invoice: {
    DRAFT: {
      label: 'Draft',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      icon: React.createElement(Edit, { size: 14 })
    },
    SENT: {
      label: 'Sent',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
      icon: React.createElement(Send, { size: 14 })
    },
    PAID: {
      label: 'Paid',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
      icon: React.createElement(CheckCircle, { size: 14 })
    },
    OVERDUE: {
      label: 'Overdue',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: React.createElement(AlertCircle, { size: 14 })
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      icon: React.createElement(XCircle, { size: 14 })
    }
  },
  subscription: {
    ACTIVE: {
      label: 'Active',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
      icon: React.createElement(CheckCircle, { size: 14 })
    },
    INACTIVE: {
      label: 'Inactive',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      icon: React.createElement(XCircle, { size: 14 })
    },
    SUSPENDED: {
      label: 'Suspended',
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      icon: React.createElement(AlertCircle, { size: 14 })
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: React.createElement(XCircle, { size: 14 })
    },
    EXPIRED: {
      label: 'Expired',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: React.createElement(Clock, { size: 14 })
    }
  }
};

// ===== FILTER CONFIGURATION =====

export const filterConfig = {
  dateRanges: [
    { value: 'today', label: 'Hari Ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'this_week', label: 'Minggu Ini' },
    { value: 'last_week', label: 'Minggu Lalu' },
    { value: 'this_month', label: 'Bulan Ini' },
    { value: 'last_month', label: 'Bulan Lalu' },
    { value: 'this_quarter', label: 'Kuartal Ini' },
    { value: 'this_year', label: 'Tahun Ini' },
    { value: 'custom', label: 'Custom Range' }
  ],
  sortOptions: [
    { value: 'created_at', label: 'Tanggal Dibuat' },
    { value: 'updated_at', label: 'Tanggal Diperbarui' },
    { value: 'amount', label: 'Jumlah' },
    { value: 'status', label: 'Status' },
    { value: 'due_date', label: 'Tanggal Jatuh Tempo' }
  ],
  sortOrder: [
    { value: 'desc', label: 'Terbaru Dulu' },
    { value: 'asc', label: 'Terlama Dulu' }
  ]
};

// ===== ANIMATION CONFIGURATION =====

export const animationConfig = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
  stagger: { delayChildren: 0.1, staggerChildren: 0.1 }
};

// ===== CSS CLASSES =====

export const cssClasses = {
  card: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200'
  },
  input: 'block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  select: 'block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  table: {
    container: 'overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg',
    table: 'min-w-full divide-y divide-gray-300',
    header: 'bg-gray-50',
    headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
    body: 'bg-white divide-y divide-gray-200',
    row: 'hover:bg-gray-50 transition-colors duration-200',
    cell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900'
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Mendapatkan konfigurasi status berdasarkan modul dan status
 */
export const getStatusConfig = (module: 'billing' | 'invoice' | 'subscription', status: string) => {
  return statusConfig[module]?.[status as keyof typeof statusConfig[typeof module]] || statusConfig.billing.PENDING;
};

/**
 * Mendapatkan konfigurasi halaman berdasarkan modul dan halaman
 */
export const getPageConfig = (module: 'billing' | 'invoice', page: string): PageConfig => {
  const config = module === 'billing' ? billingPageConfig : invoicePageConfig;
  return config[page] || config.dashboard;
};

/**
 * Mendapatkan tab items berdasarkan modul
 */
export const getTabItems = (module: 'billing' | 'invoice'): BaseTabItem[] => {
  return module === 'billing' ? billingTabItems : invoiceTabItems;
};
