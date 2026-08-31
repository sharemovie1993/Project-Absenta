import axios, { AxiosError } from 'axios';

/**
 * 🛡️ Helper to extract human-readable error messages from API responses,
 * with special translation for subscription / permission / validation errors.
 */
export function getApiErrorMessage(error: unknown, fallback: string = 'Terjadi kesalahan sistem'): string {
  if (!error) return fallback;

  if (axios.isAxiosError(error) || (error as any)?.response) {
    const axiosErr = error as AxiosError<{ message?: string; error?: string; reason?: string; code?: string }>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const message = data?.message || data?.error || axiosErr.message;
    const reason = data?.reason || data?.code;

    // 0. Specific Trial Quota Exceeded handling
    if (
      status === 403 &&
      (reason?.includes('TRIAL_LIMIT') ||
        message?.toLowerCase().includes('batas kuota percobaan') ||
        message?.toLowerCase().includes('batas percobaan'))
    ) {
      return data?.message || 'Batas kuota percobaan tercapai (Maksimal 10 data untuk mode evaluasi). Silakan aktifkan langganan modul untuk pencatatan tanpa batas.';
    }

    // 1. Specific Subscription / Entitlement handling
    if (
      status === 403 &&
      (reason?.includes('SUBSCRIPTION') ||
        message?.toLowerCase().includes('subscription') ||
        message?.toLowerCase().includes('langganan'))
    ) {
      if (message?.includes('KOPERASI') || reason?.includes('KOPERASI')) {
        return 'Langganan modul Koperasi belum aktif atau telah kedaluwarsa. Silakan periksa status langganan sekolah di Service Center.';
      }
      if (message?.includes('ABSENSI') || reason?.includes('ABSENSI')) {
        return 'Langganan modul Absensi belum aktif atau telah kedaluwarsa. Silakan periksa status langganan sekolah di Service Center.';
      }
      return data?.message || 'Langganan modul ini belum aktif atau telah kedaluwarsa. Silakan perbarui paket langganan Anda.';
    }

    // 2. 403 Forbidden general
    if (status === 403) {
      return data?.message || 'Akses ditolak: Anda tidak memiliki wewenang atau lisensi untuk melakukan tindakan ini.';
    }

    // 3. 401 Unauthorized
    if (status === 401) {
      return 'Sesi login Anda telah berakhir. Silakan login kembali.';
    }

    // 4. Custom server message if present
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }

    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}
