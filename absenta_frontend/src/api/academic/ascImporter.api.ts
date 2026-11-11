import { requestWithFallback } from '../apiUtils';

export interface EntityMapping {
  asc_id: string;
  name: string;
  code?: string;
  target_id?: string;
  parent_mapel_id?: string;
  unit_name?: string;
  action: 'MATCH' | 'CREATE' | 'IGNORE' | 'UNIT_OF_PARENT';
}

export interface LessonMappingInput {
  asc_lesson_id: string;
  sk_guru_id?: string | null;
  guru_pelaksana_id?: string | null;
  unit_name?: string | null;
  target_sumatif_slot?: number | null;
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
  saved_action?: string | null;
  saved_target_id?: string | null;
  saved_parent_mapel_id?: string | null;
  saved_unit_name?: string | null;
  suggested_parent_mapel_id?: string | null;
  suggested_parent_mapel_name?: string | null;
  suggested_unit_name?: string | null;
}

export interface AscLessonAnalysisItem {
  asc_lesson_id: string;
  subject_asc_id: string;
  subject_name: string;
  class_asc_ids: string[];
  class_names: string[];
  teacher_asc_ids: string[];
  teacher_names: string[];
  periods_per_week: number;
  periods_per_card: number;
  is_team_teaching: boolean;
  saved_lesson_mapping?: LessonMappingInput | null;
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
  lessons?: AscLessonAnalysisItem[];
  has_saved_history?: boolean;
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
  lesson_mappings?: LessonMappingInput[];
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
