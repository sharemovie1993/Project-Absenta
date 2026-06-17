export type ServiceFeatureKey =
  | 'CORE'
  | 'ABSENSI'
  | 'KOPERASI'
  | 'REPORTING'
  | 'PPDB'
  | 'RAPOR'
  | 'PERPUSTAKAAN';

export const ServiceFeatureMap: Record<string, ServiceFeatureKey> = {
  attendance: 'ABSENSI',
  cooperative: 'KOPERASI',
  reporting: 'REPORTING',
  reports: 'REPORTING',
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
