export interface UniversalKunjunganPklViewProps {
  // Universal Scoping Injections (Role-Ready)
  guruId?: string;
  guruNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  mitraId?: string;
  mitraNama?: string;
  kelasId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;

  // Display Modifiers
  isModal?: boolean;
  hideLayout?: boolean;
  hideHeaderStats?: boolean;
  hideScopeBanner?: boolean;
  readOnly?: boolean;
  className?: string;

  // Event Callbacks
  onClose?: () => void;
  onNavigateDetail?: (penempatanId: string) => void;
}

export interface KunjunganItemDetail {
  id: string;
  rawKunjunganId: string;
  penempatan_id: string;
  siswa_id: string;
  nama_siswa: string;
  nis: string;
  foto_siswa?: string | null;
  kelas: string;
  mitra_id: string;
  nama_mitra: string;
  alamat_mitra?: string;
  pembimbing_nama?: string;
  tanggal: string; // ISO string
  catatan: string; // Catatan Supervisi Guru
  catatan_dudi?: string; // Catatan / Feedback Mitra DU/DI
  foto_url?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  created_by?: string;
}

export interface KunjunganStats {
  totalKunjungan: number;
  totalMitraTerkunjungi: number;
  totalSiswaTerkunjungi: number;
  persentaseKunjungan: number;
}
