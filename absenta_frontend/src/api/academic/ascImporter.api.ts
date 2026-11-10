import { requestWithFallback } from '../apiUtils';

export interface EntityMapping {
  asc_id: string;
  name: string;
  code?: string;
  target_id?: string;
  action: 'MATCH' | 'CREATE' | 'IGNORE';
}

export interface MatchAnalysisItem {
  asc_id: string;
  name: string;
  code?: string;
  matched_db_id: string | null;
  matched_db_name: string | null;
  match_status: 'EXACT_MATCH' | 'NEW_CREATE';
  detected_jurusan?: string | null;
  matched_jurusan_nama?: string | null;
  matched_jurusan_kode?: string | null;
  total_siswa_aktif?: number;
}

export interface AscDbClassItem {
  id: string;
  name: string;
  nama_kelas?: string;
  tingkat?: number;
  jurusan_id?: string | null;
  jurusan_nama?: string | null;
  jurusan_kode?: string | null;
  is_active?: boolean;
  total_siswa_aktif?: number;
}

export interface AscAnalysisResult {
  filename: string;
  xml_content: string;
  summary: {
    total_teachers: number;
    total_classes: number;
    total_subjects: number;
    total_lessons: number;
    total_cards: number;
  };
  teachers: MatchAnalysisItem[];
  classes: MatchAnalysisItem[];
  subjects: MatchAnalysisItem[];
  db_teachers: { id: string; name: string }[];
  db_classes: AscDbClassItem[];
  db_subjects: { id: string; name: string; code?: string }[];
}

export interface ExecuteImportPayload {
  tahun_pelajaran_id: string;
  semester_id: string;
  filename: string;
  xml_content: string;
  teacher_mappings: EntityMapping[];
  class_mappings: EntityMapping[];
  subject_mappings: EntityMapping[];
}

export async function analyzeAscXml(
  file: File,
  tahunPelajaranId?: string,
  semesterId?: string
): Promise<{ success: boolean; data: AscAnalysisResult; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (tahunPelajaranId) formData.append('tahun_pelajaran_id', tahunPelajaranId);
  if (semesterId) formData.append('semester_id', semesterId);

  return requestWithFallback<{ success: boolean; data: AscAnalysisResult; message?: string }>(
    'post',
    '/academic/asc-importer/analyze',
    {
      data: formData,
      params: {
        ...(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : {}),
        ...(semesterId ? { semester_id: semesterId } : {}),
      },
    }
  );
}

export async function executeAscImport(payload: ExecuteImportPayload): Promise<{ success: boolean; message?: string; data?: any }> {
  return requestWithFallback<{ success: boolean; message?: string; data?: any }>(
    'post',
    '/academic/asc-importer/execute',
    {
      data: payload,
      timeout: 180000,
    }
  );
}
