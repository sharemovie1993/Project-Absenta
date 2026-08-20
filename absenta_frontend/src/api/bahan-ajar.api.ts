import axiosInstance from '../lib/axiosInstance';

export interface LangkahKbmSection {
  durasi_menit?: number;
  kegiatan: string[];
  teks_bacaan?: {
    judul: string;
    paragraf: string[];
  };
  lkpd?: {
    judul: string;
    petunjuk: string;
  };
}

export interface PertemuanItem {
  nomor_pertemuan: number;
  alokasi_jp: number;
  durasi_menit: number;
  topik: string;
  tujuan_pembelajaran: string[];
  langkah_kbm: {
    pendahuluan: LangkahKbmSection;
    inti: LangkahKbmSection;
    penutup: LangkahKbmSection;
  };
}

export interface BahanAjarPresetData {
  id: string;
  kode_mapel_ref: string;
  nama_mapel_ref: string;
  fase: string;
  tingkat?: number;
  judul_modul: string;
  deskripsi?: string;
  total_alokasi_jp: number;
  total_pertemuan: number;
  pendekatan?: string;
  sumber?: string;
  url_sumber?: string;
  tags: string[];
  konten_json: PertemuanItem[];
  status: string;
  created_at: string;
}

export interface AvailableModulItem {
  id: string;
  judul: string;
  fase: string;
  tingkat?: number;
  total_alokasi_jp: number;
  mapel: string;
}

export interface ReaderDataResponse {
  perangkat: any;
  konten: PertemuanItem[] | null;
  source: 'CUSTOM' | 'PRESET' | 'AUTO_MATCHED_PRESET' | 'NONE';
  available_moduls?: AvailableModulItem[];
}

/**
 * Mengambil daftar Preset Bahan Ajar Global Platform
 */
export const getBahanAjarPresets = async (params: {
  fase?: string;
  search?: string;
  kode_mapel_ref?: string;
} = {}): Promise<BahanAjarPresetData[]> => {
  const response = await axiosInstance.get('/kurikulum/bahan-ajar/presets', { params });
  return response.data?.data || [];
};

/**
 * Mengambil 1 Preset Bahan Ajar by ID
 */
export const getBahanAjarPresetById = async (id: string): Promise<BahanAjarPresetData> => {
  const response = await axiosInstance.get(`/kurikulum/bahan-ajar/presets/${id}`);
  return response.data?.data;
};

/**
 * Mengambil konten bahan ajar untuk Reader berdasarkan ID Perangkat Ajar atau filter Mapel/Tingkat
 */
export const getReaderContent = async (
  perangkatId: string,
  params?: {
    fase?: string;
    tingkat?: number;
    mapel_nama?: string;
    mapel_id?: string;
  }
): Promise<ReaderDataResponse> => {
  const response = await axiosInstance.get(`/kurikulum/bahan-ajar/reader/${perangkatId}`, {
    params
  });
  return response.data?.data;
};

/**
 * Menyimpan struktur konten bahan ajar ke Perangkat Ajar guru
 */
export const saveReaderContent = async (
  perangkatId: string,
  kontenJson: PertemuanItem[]
): Promise<any> => {
  const response = await axiosInstance.post(`/kurikulum/bahan-ajar/reader/${perangkatId}`, {
    konten_json: kontenJson
  });
  return response.data;
};

/**
 * Mengimpor preset global ke Perangkat Ajar personal guru
 */
export const importBahanAjarPreset = async (
  presetId: string,
  payload: {
    guru_id?: string;
    mapel_id: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
  }
): Promise<any> => {
  const response = await axiosInstance.post(
    `/kurikulum/bahan-ajar/presets/${presetId}/import`,
    payload
  );
  return response.data;
};
