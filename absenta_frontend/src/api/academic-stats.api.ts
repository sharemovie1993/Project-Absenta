import { requestWithFallback } from './apiUtils';

export interface AcademicStats {
  total_jurusan: number;
  total_kelas: number;
  active_kelas_by_tingkat?: { tingkat: number; count: number }[];
  total_siswa: number;
  total_guru: number;
  total_mapel: number;
  total_semester: number;
  total_tahun_pelajaran: number;
  active_semester?: string;
  tahun_pelajaran?: { id: string; tahun: string } | null;
  semester?: { id: string; nama_semester: string } | null;
}

export interface AcademicStatsResponse {
  success: boolean;
  message: string;
  data: AcademicStats;
}

// Get Academic Statistics - GET /api/academic/stats
export const getAcademicStats = async (): Promise<AcademicStatsResponse> => {
  return requestWithFallback<AcademicStatsResponse>('get', '/academic/stats', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};
