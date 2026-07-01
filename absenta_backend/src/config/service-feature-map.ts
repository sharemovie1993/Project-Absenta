export type ServiceFeatureKey =
  | 'CORE'
  | 'ABSENSI'
  | 'KOPERASI'
  | 'SARPRAS'
  | 'HUBIN'
  | 'REPORTING'
  | 'PPDB'
  | 'RAPOR'
  | 'PERPUSTAKAAN';

export const ServiceFeatureMap: Record<string, ServiceFeatureKey> = {
  // ── Modul Berbayar (Premium) ──
  attendance: 'ABSENSI',
  cooperative: 'KOPERASI',
  sarpras: 'SARPRAS',
  hubin: 'HUBIN',
  reporting: 'REPORTING',
  reports: 'REPORTING',

  // ── Modul Gratis (CORE) ──
  academic: 'CORE',
  dashboard: 'CORE',
  kesiswaan: 'CORE',
  kurikulum: 'CORE',
  documents: 'CORE',
  'document-center': 'CORE',
  'document_center': 'CORE',
  billing: 'CORE',
  user: 'CORE',
  tenant: 'CORE',
  menu: 'CORE',
  sekolah: 'CORE',
  notification: 'CORE',
  upload: 'CORE',
  pdf: 'CORE',
};
