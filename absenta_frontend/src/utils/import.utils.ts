import { requestWithFallback } from '../api/apiUtils';

/**
 * Utilitas global untuk menangani impor data dari file Excel.
 * Menyederhanakan proses pembuatan FormData dan pelacakan progress upload.
 */

export interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    created: number;
    updated: number;
    errors: Array<{ row: number; message: string }>;
  };
}

/**
 * Fungsi utama untuk mengirim file Excel ke endpoint impor backend.
 * 
 * @param endpoint - URL endpoint API impor (contoh: '/academic/siswa/import')
 * @param file - File Excel yang akan diunggah
 * @param onProgress - Callback untuk memantau progress unggahan (0-100)
 * @param socketId - ID socket opsional untuk pelacakan realtime di backend
 * @returns Promise dengan hasil impor standar
 */
export const importDataFromExcel = async (
  endpoint: string,
  file: File,
  onProgress?: (percent: number) => void,
  socketId?: string,
  extraParams: Record<string, string> = {}
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
  };

  if (socketId) {
    headers['x-socket-id'] = socketId;
  }

  // Construct URL with query parameters for extra data
  const url = new URL(endpoint, window.location.origin);
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  // Relative path for requestWithFallback
  const finalPath = url.pathname + url.search;

  return requestWithFallback<ImportResult>('post', finalPath, {
    data: formData,
    headers,
    timeout: 30 * 60 * 1000, // Timeout 30 menit untuk data besar
    onUploadProgress: (progressEvent: any) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};
