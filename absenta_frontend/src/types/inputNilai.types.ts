export interface StudentScoreItem {
  siswa_id: string;
  nama: string;
  nis: string;
  sumatif_1?: number | string | null;
  sumatif_2?: number | string | null;
  sumatif_3?: number | string | null;
  sumatif_akhir?: number | string | null;
  deskripsi_cp?: string | null;
  nilai?: number | string | null;
  deskripsi?: string | null;
}

export interface TeacherTaskItem {
  kelas_id: string;
  mapel_id: string;
  nama_kelas: string;
  nama_mapel: string;
  total_siswa: number;
  siswa_terisi: number;
  status: 'completed' | 'partial' | 'empty';
}

export interface TeacherProgressInfo {
  total_tasks: number;
  completed_tasks: number;
  partial_tasks: number;
  empty_tasks: number;
  percentage: number;
  tasks: TeacherTaskItem[];
}

export interface ClassItem {
  id: string;
  nama_kelas: string;
  tingkat?: string;
}

export interface SubjectItem {
  id: string;
  nama_mapel: string;
  kode_mapel: string;
}

export interface CategoryItem {
  id: string;
  nama: string;
  kode: string;
  bobot: number;
}
