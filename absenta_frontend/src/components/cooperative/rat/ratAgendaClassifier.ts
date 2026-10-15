/**
 * Modul Klasifikasi Butir Acara RAT Koperasi (Selective Rundown Awareness)
 * Berdasarkan UU Perkoperasian No. 25/1992 dan Permenkop UKM No. 19/2015.
 */

export type AgendaMinuteObligation = 'MANDATORY' | 'ADVISORY' | 'CEREMONIAL';

export interface AgendaMinuteClassification {
  obligation: AgendaMinuteObligation;
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  helperText: string;
  defaultCategory: 'DISCUSSION' | 'SUGGESTION' | 'OBJECTION' | 'CONCLUSION' | 'ANNOUNCEMENT' | 'OPENING';
  isMandatory: boolean;
  priorityScore: number; // 3 = MANDATORY, 2 = ADVISORY, 1 = CEREMONIAL
}

export type AgendaVotingRecommendation = 'RECOMMENDED' | 'OPTIONAL_DEADLOCK' | 'NOT_APPLICABLE';

/**
 * Kata kunci butir acara seremonial / protokoler (tidak wajib notulensi substantif)
 */
const CEREMONIAL_KEYWORDS = [
  'pembukaan', 'doa', 'indonesia raya', 'menyanyikan lagu',
  'mars koperasi', 'hymne', 'ramah tamah', 'istirahat', 'ishoma',
  'coffee break', 'snack', 'makan siang', 'hiburan', 'doorprize',
  'undian', 'penutupan', 'foto bersama', 'penutup', 'selamat datang'
];

/**
 * Kata kunci arahan / sambutan pembina / dinas (disarankan dicatat sebagai arahan)
 */
const ADVISORY_KEYWORDS = [
  'sambutan dinas', 'pengarahan dinas', 'arahan dinas', 'dinas koperasi',
  'dekopin', 'pembina', 'yayasan', 'kepala sekolah', 'instansi',
  'narasumber', 'tamu undangan', 'pengarahan'
];

/**
 * Kata kunci agenda statuter yuridis yang wajib menghasilkan Surat Ketetapan (TAP RAT)
 */
const STATUTORY_TAP_KEYWORDS = [
  'tata tertib', 'tatib', 'lpj', 'pertanggungjawaban', 'laporan pengurus',
  'lhp', 'pengawas', 'laporan pengawas', 'pengawasan', 'shu',
  'sisa hasil usaha', 'rencana kerja', 'rapbk', 'rk & rapbk', 'rk dan rapbk',
  'anggaran pendapatan', 'anggaran belanja', 'pemilihan', 'formatur',
  'penetapan pengurus', 'penetapan pengawas', 'suksesi', 'pandangan umum',
  'tanggapan pengurus', 'anggaran dasar', 'ad/art', 'ad-art', 'perubahan ad',
  'ketetapan', 'pengesahan'
];

/**
 * Kata kunci butir acara yang sangat disarankan e-Voting Luber Jurdil
 */
const VOTING_RECOMMENDED_KEYWORDS = [
  'pemilihan', 'formatur', 'pemungutan suara', 'suksesi',
  'penetapan pengurus', 'penetapan pengawas', 'calon pengurus',
  'calon pengawas', 'anggaran dasar', 'ad/art', 'perubahan ad'
];

/**
 * Memeriksa apakah butir agenda merupakan agenda statuter yuridis
 * yang wajib menghasilkan Surat Ketetapan (TAP RAT)
 */
export function isStatutoryTapAgenda(title: string): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return STATUTORY_TAP_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Menentukan rekomendasi kebutuhan e-Voting pada butir acara RAT
 */
export function getAgendaVotingRecommendation(title: string): AgendaVotingRecommendation {
  if (!title) return 'NOT_APPLICABLE';
  const lower = title.toLowerCase();

  if (CEREMONIAL_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'NOT_APPLICABLE';
  }

  if (VOTING_RECOMMENDED_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'RECOMMENDED';
  }

  return 'OPTIONAL_DEADLOCK';
}

/**
 * Menentukan tingkat kewajiban pencatatan notulensi pada rundown acara (Selective Aware)
 */
export function getAgendaMinuteRequirement(title: string): AgendaMinuteClassification {
  if (!title) {
    return {
      obligation: 'MANDATORY',
      label: 'Wajib Notulensi Substantif',
      shortLabel: 'Wajib Notulensi',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      borderClass: 'border-amber-500/40',
      helperText: 'Wajib dicatat. Memuat pertanyaan anggota, tanggapan pengurus, dan konsensus sidang sebagai dasar legalitas Berita Acara & TAP RAT.',
      defaultCategory: 'DISCUSSION',
      isMandatory: true,
      priorityScore: 3,
    };
  }

  const lower = title.toLowerCase();

  // 1. Cek Seremonial / Protokoler
  // Kecualikan jika judul juga memuat unsur pengesahan/pemilihan (misal: "Pembukaan & Pengesahan Tatib")
  const isCeremonial = CEREMONIAL_KEYWORDS.some((kw) => lower.includes(kw));
  const hasStatutory = STATUTORY_TAP_KEYWORDS.some((kw) => lower.includes(kw));

  if (isCeremonial && !hasStatutory) {
    return {
      obligation: 'CEREMONIAL',
      label: 'Seremonial / Protokoler',
      shortLabel: 'Opsional',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      borderClass: 'border-slate-300 dark:border-slate-700',
      helperText: 'Seremonial / Protokoler. Tidak wajib notulensi formal. Catatan hanya dibuat bila terdapat pengumuman atau peristiwa khusus.',
      defaultCategory: 'OPENING',
      isMandatory: false,
      priorityScore: 1,
    };
  }

  // 2. Cek Arahan / Sambutan Pembina / Dinas
  const isAdvisory = ADVISORY_KEYWORDS.some((kw) => lower.includes(kw));
  if (isAdvisory && !hasStatutory) {
    return {
      obligation: 'ADVISORY',
      label: 'Arahan / Catatan Pembinaan',
      shortLabel: 'Disarankan',
      badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      borderClass: 'border-cyan-500/40',
      helperText: 'Disarankan dicatat. Memuat arahan pembinaan, evaluasi dinas, atau amanat pimpinan untuk kemajuan koperasi.',
      defaultCategory: 'DISCUSSION',
      isMandatory: false,
      priorityScore: 2,
    };
  }

  // 3. Substantif / Statuter (Wajib Notulensi)
  return {
    obligation: 'MANDATORY',
    label: 'Wajib Notulensi Substantif',
    shortLabel: 'Wajib Notulensi',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    borderClass: 'border-amber-500/40',
    helperText: 'Wajib dicatat. Memuat pertanyaan anggota, sanggahan, tanggapan pengurus, dan konsensus sidang sebagai dasar legalitas Berita Acara & TAP RAT.',
    defaultCategory: 'DISCUSSION',
    isMandatory: true,
    priorityScore: 3,
  };
}
