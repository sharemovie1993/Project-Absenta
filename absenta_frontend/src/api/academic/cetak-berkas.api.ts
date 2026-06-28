import { requestWithFallback } from '../apiUtils';

export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  status_text: string;
  action_path: string;
  details?: Record<string, any>;
}

export interface PrepChecklistData {
  current_year: { id: string; tahun: string } | null;
  current_semester: { id: string; nama_semester: string } | null;
  target_year: { id: string; tahun: string } | null;
  target_semester: { id: string; nama_semester: string } | null;
  completion_percentage: number;
  checklist: ChecklistItem[];
}

export interface PrepChecklistResponse {
  success: boolean;
  message: string;
  data: PrepChecklistData;
}

// GET /api/academic/prep-checklist
export const getPrepChecklist = async (): Promise<PrepChecklistResponse> => {
  return requestWithFallback<PrepChecklistResponse>('get', '/academic/prep-checklist', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
};
export const getCetakBerkasChecklist = getPrepChecklist;
export type CetakBerkasChecklistItem = ChecklistItem;
export type CetakBerkasData = PrepChecklistData;
export type CetakBerkasResponse = PrepChecklistResponse;
