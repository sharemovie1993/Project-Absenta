export enum ModuleCapability {
  CORE = 'CORE',
  ABSENSI = 'ABSENSI',
  KOPERASI = 'KOPERASI',
  REPORTING = 'REPORTING',
  RAPOR = 'RAPOR',
  PPDB = 'PPDB',
  PERPUSTAKAAN = 'PERPUSTAKAAN',
  HUBIN = 'HUBIN',
  SARPRAS = 'SARPRAS',
  WHATSAPP = 'WHATSAPP',
}

export const DEFAULT_CAPABILITIES: ModuleCapability[] = [ModuleCapability.CORE];
