import { requestWithFallback } from '../apiUtils';

export interface RekapKelasBulananResponse {
  success: boolean;
  message: string;
  data: {
    kelas_id: string;
    bulan: string;
    total_hadir: number;
    total_sakit: number;
    total_izin: number;
    total_alpa: number;
    total_telat: number;
    persentase_kehadiran: number;
    students?: Array<{
      id: string;
      nama: string;
      hadir: number;
      sakit: number;
      izin: number;
      alpa: number;
      persentase: number;
      total_poin?: number;
    }>;
  };
}

export const getRekapKelasBulanan = async (kelasId: string, bulan?: string) => {
  const params = bulan ? { bulan } : {};
  return requestWithFallback<RekapKelasBulananResponse>('get', `/attendance/rekap/kelas/${kelasId}/bulanan`, { params });
};

export interface RekapHarianGuruResponse {
  nama_guru: string;
  mapel: string;
  kelas: string;
  status: string;
}

export const getRekapHarianGuru = async (tanggal: string) => {
  return requestWithFallback<RekapHarianGuruResponse[]>('get', `/attendance/rekap/guru/harian`, { params: { tanggal } });
};
