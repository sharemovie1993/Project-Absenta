/**
 * Utility functions untuk export data ke berbagai format
 */

export interface ExportColumn<T extends Record<string, unknown>> {
  key: keyof T & string;
  label: string;
  formatter?: (value: T[keyof T]) => string;
}

export interface ExportOptions<T extends Record<string, unknown>> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  format: 'CSV' | 'EXCEL';
}

/**
 * Convert data to CSV format
 */
export const exportToCSV = <T extends Record<string, unknown>>(options: ExportOptions<T>): void => {
  const { filename, columns, data } = options;
  
  // Create CSV header
  const headers = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const raw = item[col.key];
      let str = (col.formatter && raw !== null && raw !== undefined) ? col.formatter(raw) : (raw === null || raw === undefined ? '' : String(raw));
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  
  // Combine header and rows
  const csvContent = [headers, ...rows].join('\n');
  
  // Create and download file
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

/**
 * Convert data to Excel format (using CSV with Excel-specific formatting)
 */
export const exportToExcel = <T extends Record<string, unknown>>(options: ExportOptions<T>): void => {
  const { filename, columns, data } = options;
  
  // For now, we'll use CSV format but with .xlsx extension
  // In a real implementation, you might want to use a library like xlsx
  const headers = columns.map(col => col.label).join('\t');
  
  const rows = data.map(item => {
    return columns.map(col => {
      const raw = item[col.key];
      const str = (col.formatter && raw !== null && raw !== undefined) ? col.formatter(raw) : (raw === null || raw === undefined ? '' : String(raw));
      return str;
    }).join('\t');
  });
  
  const content = [headers, ...rows].join('\n');
  downloadFile(content, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

/**
 * Download file to user's device
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  window.URL.revokeObjectURL(url);
};

/**
 * Format date for export
 */
export const formatDateForExport = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

/**
 * Format currency for export
 */
export const formatCurrencyForExport = (amount: number): string => {
  if (typeof amount !== 'number') return '0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Format status for export
 */
export const formatStatusForExport = (status: string): string => {
  const statusMap: Record<string, string> = {
    'ACTIVE': 'Aktif',
    'INACTIVE': 'Tidak Aktif',
    'SUSPENDED': 'Ditangguhkan',
    'PENDING': 'Menunggu',
    'COMPLETED': 'Selesai',
    'CANCELLED': 'Dibatalkan',
    'PAID': 'Dibayar',
    'UNPAID': 'Belum Dibayar',
    'OVERDUE': 'Terlambat'
  };
  
  return statusMap[status] || status;
};
