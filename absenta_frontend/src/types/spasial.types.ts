export type TipeDenah = 'MASTER_SARPRAS' | 'EVENT_UJIAN';

export type KategoriRuang =
  | 'RUANG_UJIAN'
  | 'LAB'
  | 'TOILET'
  | 'KANTOR'
  | 'PERPUSTAKAAN'
  | 'LAPANGAN'
  | 'KORIDOR'
  | 'LAINNYA';

export interface DenahElementNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  kunci_teks_tegak?: boolean; // Jika true / undefined (default), teks tidak ikut berputar saat kotak di-rotate
  flip_h?: boolean; // Mirror horizontal
  flip_v?: boolean; // Mirror vertical
  posisi_pintu?: 'BAWAH' | 'ATAS' | 'KIRI' | 'KANAN' | 'TIDAK_ADA';
  label_utama: string; // e.g. "R.01" or "LAB KOMPUTER 1"
  label_sub?: string; // e.g. "X TJKT 1"
  kategori_ruang: KategoriRuang;
  warna_bg?: string;
  warna_border?: string;
  warna_teks?: string;
  kelas_id?: string;
  tingkat?: number; // Tingkat kelas: 10 (X), 11 (XI), 12 (XII), 13 (XIII)
  ruang_id?: string;
  kapasitas?: number;
  catatan?: string;
}

export type MapTileProvider = 'esri_satelit' | 'google_hybrid' | 'google_satelit' | 'osm';

export interface DenahMapGuideConfig {
  enabled: boolean;
  lat: number;
  lng: number;
  zoom: number;
  rotation?: number; // Derajat rotasi peta (-180 s/d 180) agar gedung lurus dengan canvas
  opacity: number;
  layer: MapTileProvider;
  is_locked: boolean;
  location_name?: string;
}

export type DenahImageFitMode = 'contain' | 'cover' | 'original' | 'custom';

export interface DenahImageGuideConfig {
  enabled: boolean;
  url: string;
  file_name?: string;
  opacity: number; // 0.05 s/d 1.0 (default 0.85)
  x: number; // offset X dalam pixel kanvas (default 0)
  y: number; // offset Y dalam pixel kanvas (default 0)
  scale: number; // faktor skala (0.1 s/d 5.0, default 1.0)
  rotation: number; // derajat rotasi (-180 s/d 180, default 0)
  fit: DenahImageFitMode;
  is_locked: boolean; // true = terkunci mati sebagai background, false = bisa digeser langsung di kanvas
}

export interface DenahSpasial {
  id: string;
  tenant_id?: string;
  nama_denah: string;
  tipe: TipeDenah;
  event_cbt_id?: string | null;
  lantai: number;
  gedung?: string | null;
  canvas_width: number;
  canvas_height: number;
  grid_size: number;
  elements: DenahElementNode[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDenahDTO {
  nama_denah: string;
  tipe?: TipeDenah;
  event_cbt_id?: string | null;
  lantai?: number;
  gedung?: string | null;
  canvas_width?: number;
  canvas_height?: number;
  grid_size?: number;
  elements?: DenahElementNode[];
}

export interface UpdateDenahDTO {
  nama_denah?: string;
  tipe?: TipeDenah;
  event_cbt_id?: string | null;
  lantai?: number;
  gedung?: string | null;
  canvas_width?: number;
  canvas_height?: number;
  grid_size?: number;
  elements?: DenahElementNode[];
  is_active?: boolean;
}
