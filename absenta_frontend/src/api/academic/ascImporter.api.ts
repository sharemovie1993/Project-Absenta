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
  db_classes: { id: string; name: string }[];
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

export async function analyzeAscXml(file: File): Promise<{ success: boolean; data: AscAnalysisResult; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return requestWithFallback<{ success: boolean; data: AscAnalysisResult; message?: string }>(
    'post',
    '/academic/asc-importer/analyze',
    {
      data: formData,
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
