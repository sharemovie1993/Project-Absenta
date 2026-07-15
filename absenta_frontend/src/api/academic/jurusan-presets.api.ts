import { requestWithFallback } from "../apiUtils";

export interface GlobalJurusanPreset {
  id: string;
  program_preset_id: string;
  nama: string;
  kode: string;
  singkatan: string;
  created_at: string;
  updated_at: string;
}

export interface GlobalProgramPreset {
  id: string;
  bidang_keahlian: string;
  nama: string;
  kode: string;
  singkatan: string;
  created_at: string;
  updated_at: string;
  jurusans: GlobalJurusanPreset[];
}

// Get all global program and jurusan presets
export const getGlobalPresets = async (): Promise<{ success: boolean; data: GlobalProgramPreset[] }> => {
  return requestWithFallback<{ success: boolean; data: GlobalProgramPreset[] }>('get', '/academic/jurusan/presets');
};

// Create a new global program preset
export const createGlobalProgramPreset = async (payload: {
  bidang_keahlian: string;
  nama: string;
  kode: string;
  singkatan: string;
}): Promise<{ success: boolean; message: string; data: GlobalProgramPreset }> => {
  return requestWithFallback<{ success: boolean; message: string; data: GlobalProgramPreset }>('post', '/academic/jurusan/presets', { data: payload });
};

// Update a global program preset
export const updateGlobalProgramPreset = async (
  id: string,
  payload: {
    bidang_keahlian?: string;
    nama?: string;
    kode?: string;
    singkatan?: string;
  }
): Promise<{ success: boolean; message: string; data: GlobalProgramPreset }> => {
  return requestWithFallback<{ success: boolean; message: string; data: GlobalProgramPreset }>('put', `/academic/jurusan/presets/${id}`, { data: payload });
};

// Delete a global program preset
export const deleteGlobalProgramPreset = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/jurusan/presets/${id}`);
};

// Create a child global jurusan preset under a program
export const createGlobalJurusanPreset = async (payload: {
  program_preset_id: string;
  nama: string;
  kode: string;
  singkatan: string;
}): Promise<{ success: boolean; message: string; data: GlobalJurusanPreset }> => {
  return requestWithFallback<{ success: boolean; message: string; data: GlobalJurusanPreset }>('post', '/academic/jurusan/presets/jurusans', { data: payload });
};

// Update a global jurusan preset
export const updateGlobalJurusanPreset = async (
  id: string,
  payload: {
    nama?: string;
    kode?: string;
    singkatan?: string;
  }
): Promise<{ success: boolean; message: string; data: GlobalJurusanPreset }> => {
  return requestWithFallback<{ success: boolean; message: string; data: GlobalJurusanPreset }>('put', `/academic/jurusan/presets/jurusans/${id}`, { data: payload });
};

// Delete a global jurusan preset
export const deleteGlobalJurusanPreset = async (id: string): Promise<{ success: boolean; message: string }> => {
  return requestWithFallback<{ success: boolean; message: string }>('delete', `/academic/jurusan/presets/jurusans/${id}`);
};
