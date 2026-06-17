import { requestWithFallback } from "../apiUtils";
import type { TahunPelajaran } from "../../types/academic";

export interface ClassMapping { fromKelasId: string; toKelasId: string }
export interface OverrideItem { siswaId: string; status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS' }
export interface TransitionPreviewInput {
  tahunPelajaranLamaId: string;
  tahunPelajaranBaruId: string;
  mappingKelas?: ClassMapping[];
  overrides?: OverrideItem[];
}

export interface TransitionPreviewItem {
  siswaId: string;
  namaSiswa: string;
  fromKelas: string;
  toKelas: string | null;
  status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS';
}

export interface TransitionPreviewResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    byStatus: { NAIK: number; TINGGAL: number; PINDAH: number; LULUS: number };
    warnings: string[];
    items: TransitionPreviewItem[];
  };
}

export interface TransitionExecuteResponse {
  success: boolean;
  message: string;
  data: { inserted: number; tahunPelajaranBaruId: string; semester: 'GANJIL' };
}

export const previewTransition = async (payload: TransitionPreviewInput): Promise<TransitionPreviewResponse> => {
  return requestWithFallback<TransitionPreviewResponse>('post', '/academic/transition/preview', { data: payload });
};

export const executeTransition = async (payload: TransitionPreviewInput): Promise<TransitionExecuteResponse> => {
  return requestWithFallback<TransitionExecuteResponse>('post', '/academic/transition/execute', { data: payload });
};

