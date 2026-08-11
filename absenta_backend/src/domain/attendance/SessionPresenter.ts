/**
 * SessionPresenter (Response Standardization Mapper)
 * Ensures 100% consistent API JSON payload responses across all session endpoints.
 */
export interface StandardizedSessionItem {
  id: string;
  sesi_id: string;
  nama_kegiatan: string;
  jenis_kegiatan: string;
  nama_kelas: string;
  nama_guru: string;
  status: string;
  waktu_tap_str?: string | null;
  catatan?: string | null;
}

export class SessionPresenter {
  /**
   * Formats student session attendance record into standardized response object.
   */
  public static formatStudentSessionItem(absen: any, formattedTimeStr?: string | null): StandardizedSessionItem {
    const sesi = absen.SesiAbsensi || {};
    return {
      id: absen.id,
      sesi_id: absen.sesi_id || sesi.id || '',
      nama_kegiatan: sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan || 'Sesi Pembelajaran',
      jenis_kegiatan: sesi.jenis_kegiatan || 'KBM',
      nama_kelas: sesi.Kelas?.nama_kelas || '-',
      nama_guru: sesi.Guru?.nama_guru || '-',
      status: absen.status || 'ALPA',
      waktu_tap_str: formattedTimeStr || (absen.created_at ? new Date(absen.created_at).toISOString() : null),
      catatan: absen.catatan || null
    };
  }

  /**
   * Formats teacher session attendance record into standardized response object.
   */
  public static formatTeacherSessionItem(absen: any, formattedTimeStr?: string | null): StandardizedSessionItem {
    const sesi = absen.SesiAbsensi || {};
    return {
      id: absen.id,
      sesi_id: absen.sesi_id || sesi.id || '',
      nama_kegiatan: sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan || 'Sesi Mengajar',
      jenis_kegiatan: sesi.jenis_kegiatan || 'KBM',
      nama_kelas: sesi.Kelas?.nama_kelas || '-',
      nama_guru: absen.Guru?.nama_guru || '-',
      status: absen.status || 'HADIR',
      waktu_tap_str: formattedTimeStr || (absen.waktu_tap ? new Date(absen.waktu_tap).toISOString() : null),
      catatan: absen.catatan || null
    };
  }
}
