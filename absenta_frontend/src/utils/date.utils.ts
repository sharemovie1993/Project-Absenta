/**
 * Standardized Date Utilities adhering to Absenta Hardening Pillar 29
 * (Date & Timezone Guard, Indonesian Locale, Zero NaN dates)
 */

export const formatDate = (
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options
    };
    
    return d.toLocaleDateString('id-ID', defaultOptions);
  } catch {
    return '-';
  }
};

export const formatDateTime = (
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return d.toLocaleDateString('id-ID', defaultOptions);
  } catch {
    return '-';
  }
};

export const formatTime = (
  date: string | number | Date | null | undefined
): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

export default {
  formatDate,
  formatDateTime,
  formatTime
};
