import { z } from 'zod';

export const scoreFieldSchema = z.number().min(0).max(100).nullable();

export const deskripsiTpSchema = z.object({
  mitra_id: z.string().min(1, 'Mitra DUDI wajib dipilih'),
  deskripsi_tp: z.string().min(5, 'Deskripsi minimal 5 karakter'),
});

export const scoreSchema = z.object({
  score: z.number().min(0).max(100).optional(),
});

export interface HubinAssessmentSettings {
  assessmentMode?: 'DUDI_ONLY' | 'COMPOSITE';
  weightDudi?: number;
  weightLaporan?: number;
  weightSidang?: number;
}

export interface ScoreRow {
  siswa_pkl_id: string;
  nama_siswa: string;
  nis: string;
  foto?: string | null;
  kelas_id?: string;
  nama_kelas?: string;
  mitra_nama: string;
  instruktur_nama: string;
  penanggung_jawab_nama: string;
  alamat_dudi: string;
  hard_kompetensi_teknis: number | null;
  hard_sop_k3lh: number | null;
  hard_alur_bisnis: number | null;
  soft_kedisiplinan: number | null;
  soft_kerajinan_inisiatif: number | null;
  soft_kerjasama: number | null;
  soft_kejujuran: number | null;
  soft_tanggung_jawab: number | null;
  nilai_laporan: number | null;
  nilai_sidang: number | null;
  penguji_nama: string;
  catatan_sidang: string;
  file_portofolio?: string | null;
  nilai_akhir_pkl: number | null;
  predikat_pkl: string;
  catatan_pkl: string;
  sakit_pkl: number;
  izin_pkl: number;
  alpa_pkl: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  auto_hadir?: number;
  nomor_sertifikat: string;
  deskripsi_tp: string;
  status?: string;
}

export interface RawPklItem {
  id?: string;
  siswa_pkl_id?: string;
  Siswa?: { 
    id?: string;
    nama_siswa?: string; 
    nis?: string; 
    nisn?: string;
    foto?: string | null;
    kelas_id?: string;
    Kelas?: { id?: string; nama_kelas?: string };
  };
  SiswaAkademik?: {
    id?: string;
    kelas_id?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    kelas?: { id?: string; nama_kelas?: string };
    tahunPelajaran?: { id?: string; tahun?: string };
    semester?: { id?: string; nama_semester?: string };
  };
  Pembimbing?: {
    id?: string;
    nama_guru?: string;
    nip?: string;
  };
  siswa_nama?: string;
  nis?: string;
  foto?: string | null;
  Mitra?: { nama?: string; alamat?: string };
  mitra_nama?: string;
  instruktur_nama?: string;
  penanggung_jawab_nama?: string;
  alamat_dudi?: string;
  hard_kompetensi_teknis?: number | null;
  hard_sop_k3lh?: number | null;
  hard_alur_bisnis?: number | null;
  soft_kedisiplinan?: number | null;
  soft_kerajinan_inisiatif?: number | null;
  soft_kerjasama?: number | null;
  soft_kejujuran?: number | null;
  soft_tanggung_jawab?: number | null;
  jurnal_json?: {
    file_url?: string;
    status?: string;
  };
  nilai_json?: {
    dudi_avg?: number | null;
    nilai_laporan?: number | null;
    nilai_sidang?: number | null;
    penguji_nama?: string | null;
    penguji_id?: string | null;
    catatan_sidang?: string | null;
    tanggal_sidang?: string | null;
  };
  nilai_akhir_pkl?: number | null;
  predikat_pkl?: string;
  catatan_pkl?: string;
  sakit_pkl?: number;
  izin_pkl?: number;
  alpa_pkl?: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  auto_hadir?: number;
  nomor_sertifikat?: string;
  deskripsi_tp?: string;
  status?: string;
}

export interface DeskripsiTpItem {
  id: string;
  mitra_id?: string;
  deskripsi_tp: string;
  Mitra?: { nama: string };
}

export function calculateNilaiAkhirPkl(
  target: Partial<ScoreRow>,
  settings?: HubinAssessmentSettings
): { nilai_akhir_pkl: number | null; predikat_pkl: string } {
  const dudiGradeList = [
    target.hard_kompetensi_teknis,
    target.hard_sop_k3lh,
    target.hard_alur_bisnis,
    target.soft_kedisiplinan,
    target.soft_kerajinan_inisiatif,
    target.soft_kerjasama,
    target.soft_kejujuran,
    target.soft_tanggung_jawab,
  ].filter((g): g is number => typeof g === 'number' && g !== null);

  const dudiAvg = dudiGradeList.length > 0
    ? dudiGradeList.reduce((a, b) => a + b, 0) / dudiGradeList.length
    : null;

  const isComposite = settings?.assessmentMode === 'COMPOSITE';
  const wDudi = settings?.weightDudi ?? 70;
  const wLaporan = settings?.weightLaporan ?? 15;
  const wSidang = settings?.weightSidang ?? 15;

  let nilai_akhir: number | null = null;

  if (isComposite) {
    let totalScore = 0;
    let totalWeight = 0;
    if (dudiAvg !== null) {
      totalScore += dudiAvg * wDudi;
      totalWeight += wDudi;
    }
    if (target.nilai_laporan !== null && target.nilai_laporan !== undefined) {
      totalScore += Number(target.nilai_laporan) * wLaporan;
      totalWeight += wLaporan;
    }
    if (target.nilai_sidang !== null && target.nilai_sidang !== undefined) {
      totalScore += Number(target.nilai_sidang) * wSidang;
      totalWeight += wSidang;
    }
    nilai_akhir = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : null;
  } else {
    nilai_akhir = dudiAvg !== null ? Math.round(dudiAvg * 10) / 10 : null;
  }

  let predikat = '-';
  if (nilai_akhir !== null) {
    if (nilai_akhir >= 90) predikat = 'Amat Baik';
    else if (nilai_akhir >= 80) predikat = 'Baik';
    else if (nilai_akhir >= 70) predikat = 'Cukup';
    else predikat = 'Kurang';
  }

  return { nilai_akhir_pkl: nilai_akhir, predikat_pkl: predikat };
}
