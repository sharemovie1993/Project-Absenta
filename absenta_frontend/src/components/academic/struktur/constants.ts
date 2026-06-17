import type { GroupConfig } from './types';

export const GROUP_CONFIG: GroupConfig[] = [
  {
    id: 'G1',
    title: 'Pimpinan & Manajemen',
    subtitle: 'Manajerial Sekolah',
    codes: ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU'],
    gradient: 'from-indigo-600 to-indigo-800'
  },
  {
    id: 'G2',
    title: 'Akademik & Kompetensi',
    subtitle: 'Ketua Program & Wali Kelas',
    codes: ['KAPROG', 'KABENG', 'TOOLMAN', 'WALIKELAS'],
    gradient: 'from-amber-600 to-amber-800'
  },
  {
    id: 'G3',
    title: 'Layanan & Bimbingan',
    subtitle: 'Konseling & Petugas Khusus',
    codes: ['BPBK', 'BKK', 'GERBANG', 'PETUGAS_KELAS'],
    gradient: 'from-sky-600 to-sky-800'
  }
];
