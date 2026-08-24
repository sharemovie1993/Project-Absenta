export interface Subject {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
}

export interface Teacher {
  id: string;
  nama_guru: string;
  nip?: string;
}

export const JENIS_LABELS: Record<string, string> = {
  MODUL_AJAR: 'Modul Ajar / RPP',
  ATP: 'Alur Tujuan Pembelajaran (ATP)',
  MODUL_PROJEK: 'Modul Projek (P5)',
  PROTA: 'Program Tahunan (PROTA)',
  PROMES: 'Program Semester (PROMES)',
  KKTP: 'Kriteria Ketercapaian TP (KKTP)',
};
