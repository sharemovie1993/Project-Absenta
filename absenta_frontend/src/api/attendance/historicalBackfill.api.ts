import { api } from '../api';

export interface BackfillPreviewSummary {
  totalSiswa: number;
  totalHariKbm: number;
  startDate?: string;
  endDate?: string;
  counts: {
    totalHadir: number;
    totalSakit: number;
    totalIzin: number;
    totalAlpa: number;
    totalDispen: number;
    grandTotal: number;
  };
}

export interface BackfillParsedStudent {
  nis: string;
  nama: string;
  matched: boolean;
  studentId: string | null;
  counts: { H: number; S: number; I: number; A: number; D: number };
  statusMap: Record<string, string>;
}

export interface BackfillPreviewResponse {
  success: boolean;
  summary: BackfillPreviewSummary;
  dateList: string[];
  students: BackfillParsedStudent[];
  warnings: string[];
}

export interface BackfillExecutePayload {
  kelasId: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  dateList: string[];
  students: {
    nis: string;
    studentId?: string;
    statusMap: Record<string, string>;
  }[];
}

export interface BackfillExecuteResponse {
  success: boolean;
  message: string;
  data: {
    kelasNama: string;
    totalSesiCreated: number;
    totalSesiReused: number;
    totalTanggal: number;
    totalAbsenUpserted: number;
  };
}

export const historicalBackfillApi = {
  /**
   * Unduh Berkas Template Excel Smart Backfill (.xlsx)
   */
  async downloadTemplate(params: {
    kelasId: string;
    tahunPelajaranId?: string;
    semesterId?: string;
    bulan?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    const queryParams = new URLSearchParams();
    queryParams.append('kelas_id', params.kelasId);
    if (params.tahunPelajaranId) queryParams.append('tahun_pelajaran_id', params.tahunPelajaranId);
    if (params.semesterId) queryParams.append('semester_id', params.semesterId);
    if (params.bulan) queryParams.append('bulan', String(params.bulan));
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);

    const response = await api.get(`/api/attendance/backfill/template?${queryParams.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Ambil nama file dari header jika ada
    let fileName = `Format_Backfill_Presensi_Semester_Ganjil.xlsx`;
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        fileName = match[1].trim();
      }
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Upload & Pratinjau Validasi Excel
   */
  async previewExcel(kelasId: string, file: File): Promise<BackfillPreviewResponse> {
    const formData = new FormData();
    formData.append('kelasId', kelasId);
    formData.append('file', file);

    const res = await api.post('/api/attendance/backfill/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data.data;
  },

  /**
   * Eksekusi Backfill Historis ke Sesi & Database
   */
  async execute(payload: BackfillExecutePayload): Promise<BackfillExecuteResponse> {
    const res = await api.post('/api/attendance/backfill/execute', payload);
    return res.data;
  },
};
