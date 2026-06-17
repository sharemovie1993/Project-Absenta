/**
 * Layout Utility Functions
 * Fungsi-fungsi utility yang konsisten untuk modul billing dan invoice
 * Memastikan standardisasi dalam formatting, validasi, dan operasi umum
 */

import type { BaseMetricCard } from '../components/common/BaseLayout';
type Indexable = Record<string, string | number | boolean | Date | null | undefined>;

// ===== FORMATTING UTILITIES =====

/**
 * Format currency dalam Rupiah
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numAmount);
};

/**
 * Format currency dengan dukungan kode mata uang
 */
export const formatCurrencyIntl = (amount: number | string, currency: string = 'IDR'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0);
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(numAmount);
};

/**
 * Format number dengan separator ribuan
 */
export const formatNumber = (num: number | string): string => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('id-ID').format(numValue);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format date dalam format Indonesia
 * Aman terhadap nilai undefined/null atau tanggal tidak valid
 */
export const formatDate = (date?: string | number | Date, options?: Intl.DateTimeFormatOptions): string => {
  if (!date) return '-';
  const dateObj = (typeof date === 'string' || typeof date === 'number') ? new Date(date) : date;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '-';
  
  const activeTz = ((): string => {
    try { return localStorage.getItem('active_timezone') || 'Asia/Jakarta'; } catch { return 'Asia/Jakarta'; }
  })();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: activeTz
  };
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format date dalam format singkat
 */
export const formatDateShort = (date: string | Date): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format datetime dengan jam
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ===== STATUS UTILITIES =====

/**
 * Mendapatkan badge class berdasarkan status
 */
export const getStatusBadgeClass = (status: string, module: 'billing' | 'invoice' | 'subscription' | 'payments' | 'academic' | 'users' = 'billing'): string => {
  const statusMap: Record<string, Record<string, string>> = {
    billing: {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      UNPAID: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      PAID: 'bg-green-100 text-green-800 border-green-300',
      OVERDUE: 'bg-red-100 text-red-800 border-red-300',
      CANCELLED: 'bg-slate-100 text-slate-800 border-slate-300'
    },
    invoice: {
      DRAFT: 'bg-slate-100 text-slate-800 border-slate-300',
      SENT: 'bg-blue-100 text-blue-800 border-blue-300',
      VIEWED: 'bg-purple-100 text-purple-800 border-purple-300',
      PAID: 'bg-green-100 text-green-800 border-green-300',
      OVERDUE: 'bg-red-100 text-red-800 border-red-300',
      CANCELLED: 'bg-slate-100 text-slate-800 border-slate-300'
    },
    subscription: {
      ACTIVE: 'bg-green-100 text-green-800 border-green-300',
      INACTIVE: 'bg-slate-100 text-slate-800 border-slate-300',
      SUSPENDED: 'bg-slate-100 text-slate-800 border-slate-300',
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      TRIAL: 'bg-blue-100 text-blue-800 border-blue-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300',
      CANCELED: 'bg-red-100 text-red-800 border-red-300',
      EXPIRED: 'bg-red-100 text-red-800 border-red-300'
    },
    payments: {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      PROCESSING: 'bg-blue-100 text-blue-800 border-blue-300',
      SUCCESS: 'bg-green-100 text-green-800 border-green-300',
      FAILED: 'bg-red-100 text-red-800 border-red-300',
      CANCELLED: 'bg-slate-100 text-slate-800 border-slate-300',
      CANCELED: 'bg-slate-100 text-slate-800 border-slate-300',
      EXPIRED: 'bg-orange-100 text-orange-800 border-orange-300'
    },
    academic: {
      AKTIF: 'bg-green-100 text-green-800 border-green-300',
      TIDAK_AKTIF: 'bg-slate-100 text-slate-800 border-slate-300',
      LULUS: 'bg-blue-100 text-blue-800 border-blue-300',
      PINDAH: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      KELUAR: 'bg-red-100 text-red-800 border-red-300'
    },
    users: {
      ACTIVE: 'bg-green-100 text-green-800 border-green-300',
      INACTIVE: 'bg-slate-100 text-slate-800 border-slate-300',
    }
  };
  
  return statusMap[module]?.[status] || statusMap.billing.PENDING;
};

/**
 * Mendapatkan label status yang user-friendly
 */
export const getStatusLabel = (status: string, module: 'billing' | 'invoice' | 'subscription' | 'payments' | 'academic' | 'users' = 'billing'): string => {
  const statusLabels: Record<string, Record<string, string>> = {
    billing: {
      PENDING: 'Belum Dibayar',
      UNPAID: 'Belum Dibayar',
      PAID: 'Lunas',
      OVERDUE: 'Terlambat',
      CANCELLED: 'Dibatalkan'
    },
    invoice: {
      DRAFT: 'Draft',
      SENT: 'Terkirim',
      VIEWED: 'Dibuka',
      PAID: 'Lunas',
      OVERDUE: 'Terlambat',
      CANCELLED: 'Dibatalkan'
    },
    subscription: {
      ACTIVE: 'Aktif',
      SUSPENDED: 'Ditangguhkan',
      PENDING_PAYMENT: 'Menunggu Pembayaran',
      TRIAL: 'Masa Percobaan',
      CANCELLED: 'Dibatalkan',
      CANCELED: 'Dibatalkan',
      EXPIRED: 'Kedaluwarsa'
    },
    payments: {
      PENDING: 'Menunggu',
      PROCESSING: 'Diproses',
      SUCCESS: 'Berhasil',
      FAILED: 'Gagal',
      CANCELLED: 'Dibatalkan',
      CANCELED: 'Dibatalkan',
      EXPIRED: 'Kedaluwarsa'
    },
    academic: {
      AKTIF: 'Aktif',
      TIDAK_AKTIF: 'Tidak Aktif',
      LULUS: 'Lulus',
      PINDAH: 'Pindah',
      KELUAR: 'Keluar'
    },
    users: {
      ACTIVE: 'Aktif',
      INACTIVE: 'Tidak Aktif'
    }
  };
  
  return statusLabels[module]?.[status] || status;
};

// ===== CALCULATION UTILITIES =====

/**
 * Menghitung persentase perubahan
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Menghitung total dari array objek
 */
export const calculateTotal = (items: Indexable[], field: string): number => {
  return items.reduce((total, item) => {
    const raw = item[field];
    const num = typeof raw === 'number' ? raw : (typeof raw === 'string' ? parseFloat(raw) : NaN);
    return total + (isNaN(num) ? 0 : num);
  }, 0);
};

/**
 * Menghitung rata-rata dari array objek
 */
export const calculateAverage = (items: Indexable[], field: string): number => {
  if (items.length === 0) return 0;
  const total = calculateTotal(items, field);
  return total / items.length;
};

/**
 * Menghitung growth rate
 */
export const calculateGrowthRate = (current: number, previous: number): { value: number; type: 'positive' | 'negative' | 'neutral' } => {
  const change = calculatePercentageChange(current, previous);
  
  return {
    value: Math.abs(change),
    type: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
  };
};

// ===== VALIDATION UTILITIES =====

/**
 * Validasi email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validasi nomor telepon Indonesia
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validasi amount (harus positif)
 */
export const isValidAmount = (amount: number | string): boolean => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && numAmount > 0;
};

/**
 * Validasi tanggal (tidak boleh di masa lalu untuk due date)
 */
export const isValidFutureDate = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj >= today;
};

// ===== SEARCH & FILTER UTILITIES =====

/**
 * Filter data berdasarkan search term
 */
export const filterBySearch = (items: Indexable[], searchTerm: string, searchFields: string[]): Indexable[] => {
  if (!searchTerm.trim()) return items;
  
  const term = searchTerm.toLowerCase();
  
  return items.filter(item => 
    searchFields.some(field => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    })
  );
};

/**
 * Filter data berdasarkan status
 */
export const filterByStatus = (items: Indexable[], status: string, statusField: string = 'status'): Indexable[] => {
  if (!status || status === 'ALL') return items;
  return items.filter(item => item[statusField] === status);
};

/**
 * Filter data berdasarkan date range
 */
export const filterByDateRange = (
  items: Indexable[], 
  startDate: string | Date, 
  endDate: string | Date, 
  dateField: string = 'created_at'
): Indexable[] => {
  if (!startDate || !endDate) return items;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include the entire end date
  
  return items.filter(item => {
    const raw = item[dateField];
    const itemDate = (typeof raw === 'string' || typeof raw === 'number') ? new Date(raw) : (raw instanceof Date ? raw : null);
    if (!itemDate || isNaN(itemDate.getTime())) return false;
    return itemDate >= start && itemDate <= end;
  });
};

/**
 * Sort data berdasarkan field dan order
 */
export const sortData = (items: Indexable[], sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): Indexable[] => {
  return [...items].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // String comparison
    if (String(aValue) < String(bValue)) return sortOrder === 'asc' ? -1 : 1;
    if (String(aValue) > String(bValue)) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

// ===== PAGINATION UTILITIES =====

/**
 * Paginate data
 */
export const paginateData = (items: Indexable[], page: number, limit: number): { data: Indexable[]; totalPages: number; totalItems: number } => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: items.slice(startIndex, endIndex),
    totalPages: Math.ceil(items.length / limit),
    totalItems: items.length
  };
};

// ===== METRICS UTILITIES =====

/**
 * Generate metrics untuk dashboard
 */
export const generateMetrics = (
  data: Indexable[], 
  config: { 
    totalField?: string; 
    amountField?: string; 
    statusField?: string; 
    dateField?: string;
  } = {}
): BaseMetricCard[] => {
  const {
    totalField: _totalField = 'id',
    amountField = 'amount',
    statusField = 'status',
    dateField = 'created_at'
  } = config;
  
  const total = data.length;
  const totalAmount = calculateTotal(data, amountField);
  
  // Calculate status-based metrics
  const statusCounts = data.reduce((acc, item) => {
    const status = String(item[statusField] || 'UNKNOWN');
    const prev = typeof (acc[status]) === 'number' ? acc[status] : 0;
    acc[status] = prev + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate this month vs last month
  const now = new Date();
  const thisMonth = data.filter(item => {
    const raw = item[dateField];
    const itemDate = (typeof raw === 'string' || typeof raw === 'number') ? new Date(raw) : (raw instanceof Date ? raw : null);
    return !!itemDate && !isNaN(itemDate.getTime()) && itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
  });
  
  const lastMonth = data.filter(item => {
    const raw = item[dateField];
    const itemDate = (typeof raw === 'string' || typeof raw === 'number') ? new Date(raw) : (raw instanceof Date ? raw : null);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    return !!itemDate && !isNaN(itemDate.getTime()) && itemDate.getMonth() === lastMonthDate.getMonth() && itemDate.getFullYear() === lastMonthDate.getFullYear();
  });
  
  const thisMonthCount = thisMonth.length;
  const lastMonthCount = lastMonth.length;
  const growth = calculateGrowthRate(thisMonthCount, lastMonthCount);
  
  return [
    {
      key: 'total',
      label: 'Total Items',
      value: formatNumber(total),
      change: `${growth.type === 'positive' ? '+' : growth.type === 'negative' ? '-' : ''}${formatPercentage(growth.value)} dari bulan lalu`,
      changeType: growth.type,
      icon: '📊',
      color: 'blue'
    },
    {
      key: 'amount',
      label: 'Total Amount',
      value: formatCurrency(totalAmount),
      icon: '💰',
      color: 'green'
    },
    {
      key: 'this_month',
      label: 'This Month',
      value: formatNumber(thisMonthCount),
      change: `${lastMonthCount} bulan lalu`,
      changeType: 'neutral',
      icon: '📅',
      color: 'purple'
    },
    {
      key: 'active',
      label: 'Active/Paid',
      value: (() => {
        const paid = typeof statusCounts.PAID === 'number' ? statusCounts.PAID : undefined;
        const active = typeof statusCounts.ACTIVE === 'number' ? statusCounts.ACTIVE : undefined;
        const final = (paid ?? active ?? 0);
        return formatNumber(final);
      })(),
      icon: '✅',
      color: 'green'
    }
  ];
};

// ===== EXPORT UTILITIES =====

/**
 * Convert data to CSV format
 */
export const convertToCSV = (data: Indexable[], headers: Record<string, string>): string => {
  const headerRow = Object.values(headers).join(',');
  const dataRows = data.map(item => 
    Object.keys(headers).map(key => {
      const value = item[key];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download data as CSV file
 */
export const downloadCSV = (data: Indexable[], filename: string, headers: Record<string, string>): void => {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// ===== ERROR HANDLING UTILITIES =====

/**
 * Extract error message from various error formats
 */
export const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  const e = error as { message?: string; response?: { data?: { message?: string; error?: string } } };
  if (e?.message) return e.message;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.response?.data?.error) return e.response.data.error;
  return 'Terjadi kesalahan yang tidak diketahui';
};

/**
 * Check if error is network related
 */
export const isNetworkError = (error: unknown): boolean => {
  const e = error as { code?: string; message?: string };
  return e?.code === 'NETWORK_ERROR' || 
         (typeof e?.message === 'string' && e.message.includes('Network Error')) ||
         !navigator.onLine;
};

// ===== DEBOUNCE UTILITY =====

/**
 * Debounce function untuk search
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

