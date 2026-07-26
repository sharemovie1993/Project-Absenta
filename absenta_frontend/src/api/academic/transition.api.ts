import { requestWithFallback } from "../apiUtils";

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

export interface MissingNextClassItem {
  sourceKelasId: string;
  sourceNama: string;
  sourceTingkat: number;
  suggestedNama: string;
  jurusanId: string | null;
}

export interface DetectMissingClassesResponse {
  success: boolean;
  message: string;
  data: {
    missing: MissingNextClassItem[];
  };
}

export interface CreateNextGradeClassesResponse {
  success: boolean;
  message: string;
  data: { created: number };
}

export const previewTransition = async (payload: TransitionPreviewInput): Promise<TransitionPreviewResponse> => {
  return requestWithFallback<TransitionPreviewResponse>('post', '/academic/transition/preview', { data: payload });
};

export const executeTransition = async (payload: TransitionPreviewInput): Promise<TransitionExecuteResponse> => {
  return requestWithFallback<TransitionExecuteResponse>('post', '/academic/transition/execute', { data: payload });
};

export const detectMissingNextClasses = async (): Promise<DetectMissingClassesResponse> => {
  return requestWithFallback<DetectMissingClassesResponse>('get', '/academic/transition/detect-missing-classes');
};

export const createNextGradeClasses = async (classes: Array<{ sourceKelasId: string; namaKelas: string }>): Promise<CreateNextGradeClassesResponse> => {
  return requestWithFallback<CreateNextGradeClassesResponse>('post', '/academic/transition/create-next-grade-classes', { data: { classes } });
};
