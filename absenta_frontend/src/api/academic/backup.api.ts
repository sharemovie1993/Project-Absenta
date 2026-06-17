
import { requestWithFallback, downloadBlob } from "../apiUtils";

export const exportAcademicData = async (): Promise<Blob> => {
  return downloadBlob('/academic/backup/export');
};

export const importAcademicData = async (data: any): Promise<{ success: boolean; message: string; details?: any }> => {
  return requestWithFallback<{ success: boolean; message: string; details?: any }>('post', '/academic/backup/import', { data });
};
