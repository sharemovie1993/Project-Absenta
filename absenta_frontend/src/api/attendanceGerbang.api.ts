import { requestWithFallback } from './apiUtils';
export interface TapPayload {
  siswa_id: string;
  arah: 'GERBANG_DATANG' | 'GERBANG_PULANG';
  device_id: string;
  rfid: string;
}

export interface TapResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    siswa_id: string;
    arah: string;
    device_id: string;
    rfid: string;
    timestamp: string;
  };
}

export interface GerbangDevice {
  id: string;
  name: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  last_ping: string;
}

export interface GerbangStats {
  total_taps_today: number;
  total_masuk: number;
  total_keluar: number;
  total_students_target?: number;
  active_devices: number;
  last_activity: string;
}
 
export interface IntegrationStatusData {
  integration_active: boolean;
  active_activity_sessions: Array<{
    id: string;
    jenis_kegiatan: string;
    waktu_mulai: string;
    waktu_selesai: string;
  }>;
  gate_prerequisite_enabled: boolean;
  last_sync: string;
}
export async function bypassLate(payload: { siswa_id: string; note?: string }): Promise<TapResponse> {
  try {
    return requestWithFallback<TapResponse>('post', '/attendance/gerbang/bypass', { data: payload });
  } catch (error) {
    console.error('Error submitting bypass:', error);
    throw error;
  }
}

export async function submitTap(tapData: TapPayload): Promise<TapResponse> {
  try {
    return requestWithFallback<TapResponse>('post', '/attendance/gerbang/tap', { data: tapData });
  } catch (error) {
    console.error('Error submitting tap:', error);
    throw error;
  }
}
export interface FaceVerifyPayload {
  siswa_id?: string;
  arah: 'GERBANG_DATANG' | 'GERBANG_PULANG';
  image_base64: string;
  embedding?: number[];
}
export async function verifyFaceTap(payload: FaceVerifyPayload): Promise<TapResponse> {
  try {
    return requestWithFallback<TapResponse>('post', '/attendance/gerbang/face-verify', { data: payload });
  } catch (error) {
    console.error('Error verifying face & tap:', error);
    throw error;
  }
}
export interface FaceEnrollPayload {
  siswa_id: string;
  image_base64: string;
  embedding?: number[];
  source?: string;
  embedding_type?: string;
  model_name?: string;
}
export async function enrollFaceTemplate(payload: FaceEnrollPayload): Promise<{ success: boolean; message: string; data?: { siswa_id: string; embedding_type: string } }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data?: { siswa_id: string; embedding_type: string } }>('post', '/attendance/gerbang/face-enroll', { data: payload });
  } catch (error) {
    console.error('Error enrolling face template:', error);
    throw error;
  }
}
export async function getFaceTemplates(params?: { search?: string; kelas_id?: string; limit?: number; offset?: number }): Promise<{ success: boolean; message: string; data: Array<{ id: string; siswa_id: string; embedding_type: string; model_name?: string; created_at: string; source?: string; Siswa?: { id: string; nama_siswa: string; nis: string; Kelas?: { nama_kelas: string } } }>; pagination?: { total: number; limit: number; offset: number } }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: Array<{ id: string; siswa_id: string; embedding_type: string; model_name?: string; created_at: string; source?: string; Siswa?: { id: string; nama_siswa: string; nis: string; Kelas?: { nama_kelas: string } } }>; pagination?: { total: number; limit: number; offset: number } }>('get', '/attendance/gerbang/face-templates', { 
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting face templates:', error);
    throw error;
  }
}
export async function deleteFaceTemplate(id: string): Promise<{ success: boolean; message: string }> {
  try {
    return requestWithFallback<{ success: boolean; message: string }>('delete', `/attendance/gerbang/face-templates/${id}`);
  } catch (error) {
    console.error('Error deleting face template:', error);
    throw error;
  }
}
export async function getGerbangStats(params?: { kelas_id?: string }): Promise<{ success: boolean; message: string; data: GerbangStats }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: GerbangStats }>('get', '/attendance/gerbang/stats', { 
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting gerbang stats:', error);
    throw error;
  }
}
export async function getGerbangSessions(params?: { tanggal?: string }): Promise<{ success: boolean; message: string; data: { sessions: any[]; date: string } }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: { sessions: any[]; date: string } }>('get', '/attendance/gerbang/sessions', { 
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting gerbang sessions:', error);
    throw error;
  }
}
export async function getIntegrationStatus(): Promise<{ success: boolean; message: string; data: IntegrationStatusData }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: IntegrationStatusData }>('get', '/attendance/gerbang/integration/status', {
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting integration status:', error);
    throw error;
  }
}
export async function getActivityPrerequisites(siswa_id: string): Promise<{ success: boolean; message: string; data: any }>{
  try {
    return requestWithFallback<{ success: boolean; message: string; data: any }>('get', `/attendance/gerbang/prerequisites/${siswa_id}`, {
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting activity prerequisites:', error);
    throw error;
  }
}
export async function getPresentStudents(params?: { kelas_id?: string; limit?: number; offset?: number }): Promise<{ success: boolean; message: string; data: any[] }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: any[] }>('get', '/attendance/gerbang/present', { 
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting present students:', error);
    throw error;
  }
}
export async function getStudentStatus(siswa_id: string): Promise<{ success: boolean; message: string; data: any }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: any }>('get', `/attendance/gerbang/status/${siswa_id}`, {
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting student status:', error);
    throw error;
  }
}
export async function getStudentHistory(
  siswa_id: string,
  params?: { tanggal_mulai?: string; tanggal_selesai?: string; limit?: number; offset?: number }
): Promise<{ success: boolean; message: string; data: any[] }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: any[] }>('get', `/attendance/gerbang/history/${siswa_id}`, { 
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting student history:', error);
    throw error;
  }
}

export async function getNotPresentStudents(params?: { tanggal?: string; kelas_id?: string; limit?: number; offset?: number }): Promise<{ success: boolean; message: string; data: any[]; pagination?: any; session_info?: any; filter_info?: any }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: any[]; pagination?: any; session_info?: any; filter_info?: any }>('get', '/attendance/gerbang/not-present', { 
      params,
      headers: { 'X-Skip-403-Redirect': 'true' }
    });
  } catch (error) {
    console.error('Error getting not-present students:', error);
    throw error;
  }
}

export async function markGateAbsence(payload: { siswa_id: string; status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPEN' }): Promise<{ success: boolean; message: string; data: any }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: any }>('post', '/attendance/gerbang/absence', { data: payload });
  } catch (error) {
    console.error('Error marking gate absence:', error);
    throw error;
  }
}

// Rekap endpoints
export async function getRekapBulananSiswa(
  siswa_id: string,
  params: { bulan: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: { nama_siswa: string; bulan: string; statistik: any; detail: any[] } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { nama_siswa: string; bulan: string; statistik: any; detail: any[] } }>('get', `/attendance/rekap/siswa/${siswa_id}/bulanan`, { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getRekapBulananSiswaMe(
  params: { bulan: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: { 
    nama_siswa: string; 
    bulan: string; 
    statistik: any; 
    persentase_kehadiran?: number;
    total_hadir?: number;
    total_izin?: number;
    total_sakit?: number;
    total_alpa?: number;
    total_terlambat?: number;
    total_poin?: number;
    detail: any[]; 
  } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { 
    nama_siswa: string; 
    bulan: string; 
    statistik: any; 
    persentase_kehadiran?: number;
    total_hadir?: number;
    total_izin?: number;
    total_sakit?: number;
    total_alpa?: number;
    total_terlambat?: number;
    total_poin?: number;
    detail: any[]; 
  } }>('get', `/attendance/rekap/siswa/me/bulanan`, {
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getRekapBulananKelas(
  kelas_id: string,
  params: { bulan: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: Array<{ nama_siswa: string; HADIR: number; IZIN: number; SAKIT: number; ALPA: number; TERLAMBAT: number }> }> {
  return requestWithFallback<{ success: boolean; message: string; data: Array<{ nama_siswa: string; HADIR: number; IZIN: number; SAKIT: number; ALPA: number; TERLAMBAT: number }> }>('get', `/attendance/rekap/kelas/${kelas_id}/bulanan`, { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getRekapHarianSiswa(
  siswa_id: string,
  params: { tanggal: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: { nama_siswa: string; tanggal: string; status: string; rincian: any[] } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { nama_siswa: string; tanggal: string; status: string; rincian: any[] } }>('get', `/attendance/rekap/siswa/${siswa_id}/harian`, { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getRekapHarianSiswaMe(
  params: { tanggal: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: { nama_siswa: string; tanggal: string; status: string; rincian: any[] } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { nama_siswa: string; tanggal: string; status: string; rincian: any[] } }>('get', `/attendance/rekap/siswa/me/harian`, {
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getTrackingHarianSiswa(
  siswa_id: string,
  params: { tanggal: string }
): Promise<{ success: boolean; message: string; data: { nama: string; nis?: string; tanggal: string; status?: string; kegiatan: Array<{ waktu: string; jenis_kegiatan: string; status: string; keterangan?: string | null }> } }>{
  return requestWithFallback<{ success: boolean; message: string; data: { nama: string; nis?: string; tanggal: string; status?: string; kegiatan: Array<{ waktu: string; jenis_kegiatan: string; status: string; keterangan?: string | null }> } }>('get', `/attendance/rekap/siswa/${siswa_id}/tracking`, { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
export async function getStatistikHarian(
  params: { tanggal: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: Array<{ kelas: string; HADIR: number; IZIN: number; SAKIT: number; ALPA: number; TERLAMBAT: number }> }> {
  return requestWithFallback<{ success: boolean; message: string; data: Array<{ kelas: string; HADIR: number; IZIN: number; SAKIT: number; ALPA: number; TERLAMBAT: number }> }>('get', `/attendance/rekap/statistik/harian`, { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Sesi Absensi APIs (MULTI_SESI)
export async function createSesiAbsensi(payload: { kelas_id: string; guru_id?: string; mapel_id?: string; jenis_kegiatan: string; slot_kbm?: number; tanggal: string; waktu_mulai: string; waktu_selesai?: string; tahun_pelajaran_id?: string; sumber_sesi?: string; jadwal_template_id?: string }): Promise<{ success: boolean; message: string; data: any }> {
  const tz = (localStorage.getItem('active_timezone') || 'Asia/Jakarta');
  const offset = ((): string => {
    switch (tz) {
      case 'Asia/Makassar': return '+08:00';
      case 'Asia/Jayapura': return '+09:00';
      default: return '+07:00';
    }
  })();

  const ensureOffset = (s?: string): string | undefined => {
    if (!s) return undefined;
    if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return s;
    const base = s.length === 16 ? `${s}:00` : (s.length === 19 ? s : `${s}`);
    return `${base}${offset}`;
  };

  const convertDateOnly = (d?: string): string | undefined => {
    if (!d) return undefined;
    return `${d}T00:00:00${offset}`;
  };

  const payloadWithOffset = {
    ...payload,
    tanggal: convertDateOnly(payload.tanggal)!,
    waktu_mulai: ensureOffset(payload.waktu_mulai)!,
    waktu_selesai: ensureOffset(payload.waktu_selesai),
  };

  return requestWithFallback<{ success: boolean; message: string; data: any }>('post', '/attendance/sesi-absensi', { 
    data: payloadWithOffset,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function updateSesiAbsensi(id: string, payload: { kelas_id?: string; guru_id?: string; mapel_id?: string; jenis_kegiatan?: string; slot_kbm?: number; tanggal?: string; waktu_mulai?: string; waktu_selesai?: string; tahun_pelajaran_id?: string }): Promise<{ success: boolean; message: string; data: any }>{
  const tz = (localStorage.getItem('active_timezone') || 'Asia/Jakarta');
  const offset = ((): string => {
    switch (tz) {
      case 'Asia/Makassar': return '+08:00';
      case 'Asia/Jayapura': return '+09:00';
      default: return '+07:00';
    }
  })();

  const ensureOffset = (s?: string): string | undefined => {
    if (!s) return undefined;
    if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return s;
    const base = s.length === 16 ? `${s}:00` : (s.length === 19 ? s : `${s}`);
    return `${base}${offset}`;
  };

  const convertDateOnly = (d?: string): string | undefined => {
    if (!d) return undefined;
    return `${d}T00:00:00${offset}`;
  };

  const payloadWithOffset: any = { ...payload };
  if (payload.tanggal) payloadWithOffset.tanggal = convertDateOnly(payload.tanggal);
  if (payload.waktu_mulai) payloadWithOffset.waktu_mulai = ensureOffset(payload.waktu_mulai);
  if (payload.waktu_selesai) payloadWithOffset.waktu_selesai = ensureOffset(payload.waktu_selesai);

  return requestWithFallback<{ success: boolean; message: string; data: any }>('put', `/attendance/sesi-absensi/${id}`, { data: payloadWithOffset });
}

export async function updateSesiStatus(id: string, status: 'DRAFT' | 'BERLANGSUNG' | 'SELESAI'): Promise<{ success: boolean; message: string; data: any }> {
  return requestWithFallback<{ success: boolean; message: string; data: any }>('patch', `/attendance/sesi-absensi/${id}/status`, { data: { status } });
}

export async function getSesiAbsensiList(params?: { 
  tanggal?: string; 
  kelas_id?: string; 
  guru_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  jenis_kegiatan?: string; 
  slot_kbm?: number; 
  summary?: boolean;
  journals?: boolean;
}): Promise<{ success: boolean; message: string; data: any[] }> {
  return requestWithFallback<{ success: boolean; message: string; data: any[] }>('get', '/attendance/sesi-absensi', { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function deleteSesiAbsensi(id: string): Promise<{ success: boolean; message: string; data: any }> {
  return requestWithFallback<{ success: boolean; message: string; data: any }>('delete', `/attendance/sesi-absensi/${id}`);
}

export async function notifySessionCreated(payload: { sesi_id: string; channel: 'WA' | 'PUSH'; guru_id: string; message?: string }): Promise<{ success: boolean; message: string }> {
  return requestWithFallback<{ success: boolean; message: string }>('post', '/attendance/notify/session-created', { data: payload });
}

export async function isPetugasActiveForKelas(kelas_id: string): Promise<{ success: boolean; message: string; data: { active: boolean; managed_kelas_names?: string } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { active: boolean; managed_kelas_names?: string } }>('get', `/attendance/sesi-absensi/petugas/check`, { 
    params: { kelas_id },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function isPetugasActive(): Promise<{ success: boolean; message: string; data: { active: boolean; managed_kelas_names?: string } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { active: boolean; managed_kelas_names?: string } }>('get', `/attendance/sesi-absensi/petugas/check`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function updateAbsenGuru(
  sesi_id: string,
  guru_id: string,
  payload: { status?: 'HADIR' | 'ALPA'; catatan?: string }
): Promise<{ success: boolean; message: string; data: any }> {
  return requestWithFallback<{ success: boolean; message: string; data: any }>('patch', `/attendance/sesi-absensi/${sesi_id}/absen-guru/${guru_id}`, { data: payload });
}

export async function tapSiswaKeSesi(
  sesi_id: string,
  payload: { siswa_id: string; status?: 'HADIR' | 'TERLAMBAT' | 'SAKIT' | 'IZIN' | 'ALPA' }
): Promise<{ success: boolean; message: string; data: any }> {
  return requestWithFallback<{ success: boolean; message: string; data: any }>('post', `/attendance/sesi-absensi/${sesi_id}/tap-siswa`, { data: payload });
}

export async function getSesiAbsenSiswa(
  sesi_id: string
): Promise<{ success: boolean; message: string; data: Array<{ id: string; siswa_id: string; status: string; waktu_tap: string; Siswa?: { id: string; nama_siswa: string; nis: string } }> }>{
  return requestWithFallback<{ success: boolean; message: string; data: Array<{ id: string; siswa_id: string; status: string; waktu_tap: string; Siswa?: { id: string; nama_siswa: string; nis: string } }> }>('get', `/attendance/sesi-absensi/${sesi_id}/absen-siswa`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getAttendanceFeed(params?: { tanggal?: string; kelas_id?: string; guru_id?: string; siswa_id?: string }): Promise<{ success: boolean; message: string; data: any[] }> {
  return requestWithFallback<{ success: boolean; message: string; data: any[] }>('get', '/attendance/notify/feed', { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getSesiSummary(sesi_id: string): Promise<{ success: boolean; message: string; data: { HADIR: number; TERLAMBAT: number; IZIN: number; SAKIT: number; ALPA: number; DISPEN: number } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { HADIR: number; TERLAMBAT: number; IZIN: number; SAKIT: number; ALPA: number; DISPEN: number } }>('get', `/attendance/sesi-absensi/${sesi_id}/summary`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function upsertProgresMateri(sesi_id: string, payload: { judul_materi: string; deskripsi?: string; pencapaian_persen: number; kendala?: string }): Promise<{ success: boolean; message: string; data: any }> {
  return requestWithFallback<{ success: boolean; message: string; data: any }>('post', `/attendance/sesi-absensi/${sesi_id}/progres-materi`, { 
    data: payload,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function generateSesiFromTemplate(): Promise<{ success: boolean; message: string }> {
  return requestWithFallback<{ success: boolean; message: string }>('post', '/attendance/sesi-absensi/generate-from-template', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getRekapBulananGuruMe(
  params: { bulan: string; tahun_pelajaran_id?: string }
): Promise<{ success: boolean; message: string; data: { 
    nama_guru: string; 
    bulan: string; 
    statistik: any; 
    persentase_kehadiran?: number;
    total_poin?: number;
    detail: any[]; 
  } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { 
    nama_guru: string; 
    bulan: string; 
    statistik: any; 
    persentase_kehadiran?: number;
    total_poin?: number;
    detail: any[]; 
  } }>('get', `/attendance/rekap/guru/me/bulanan`, {
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
