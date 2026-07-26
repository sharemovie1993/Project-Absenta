import * as XLSX from 'xlsx-js-style';

/**
 * Technical Key Mapping for Human Headers
 * This ensures different modules get the keys they expect.
 */
const HEADER_MAP: Record<string, string> = {
  // Common
  'KODE': 'kode',
  'TINGKAT': 'tingkat',
  'HARI': 'hari',
  'JAM MULAI': 'jam_mulai',
  'JAM SELESAI': 'jam_selesai',

  // Siswa
  'NAMA LENGKAP': 'nama_siswa',
  'NAMA': 'nama_siswa',
  'NAMA PENDAFTAR': 'nama_siswa',
  'NAMA CALON SISWA': 'nama_siswa',
  'NAMA KELAS': 'nama_kelas',
  'NIS': 'nis',
  'NISN': 'nisn',
  'JK (L/P)': 'jenis_kelamin',
  'JENIS KELAMIN': 'jenis_kelamin',
  'JK': 'jenis_kelamin',
  'TEMPAT LAHIR': 'tempat_lahir',
  'TANGGAL LAHIR (YYYY-MM-DD)': 'tanggal_lahir',
  'TANGGAL LAHIR': 'tanggal_lahir',
  'TGL LAHIR': 'tanggal_lahir',
  'TGL. LAHIR': 'tanggal_lahir',
  'TANGGAL MASUK (YYYY-MM-DD)': 'tanggal_masuk',
  'TANGGAL MASUK': 'tanggal_masuk',
  'TGL MASUK': 'tanggal_masuk',
  'TGL. MASUK': 'tanggal_masuk',
  'TANGGAL KELUAR (YYYY-MM-DD)': 'tanggal_keluar',
  'TANGGAL KELUAR': 'tanggal_keluar',
  'TGL KELUAR': 'tanggal_keluar',
  'TGL. KELUAR': 'tanggal_keluar',
  'ALAMAT': 'alamat',
  'NO. HP': 'no_hp',
  'NO HP': 'no_hp',
  'NO WA': 'no_hp',
  'NO HP/WA': 'no_hp',
  'TELEPON': 'no_hp',
  'NO TELEPON': 'no_hp',
  'NO. TELEPON': 'no_hp',
  'JURUSAN': 'jurusan',
  'PILIHAN JURUSAN': 'jurusan',
  'PILIHAN KOMPETENSI': 'jurusan',
  'PILIHAN 1': 'jurusan',
  'KOMPETENSI KEAHLIAN': 'jurusan',
  'SEKOLAH ASAL': 'sekolah_asal',
  'ASAL SEKOLAH': 'sekolah_asal',
  'NO. SERI IJAZAH SMP': 'no_ijazah_smp',
  'NO SERI IJAZAH SMP': 'no_ijazah_smp',
  'NO SERI IJAZAH': 'no_ijazah_smp',
  'NO. SERI IJAZAH': 'no_ijazah_smp',

  // Guru
  'NIP': 'nip',
  'EMAIL': 'email',
  'STATUS KEPEGAWAIAN': 'status_kepegawaian',

  // Mapel
  'NAMA MATA PELAJARAN': 'nama_mapel',
  'KODE MAPEL': 'kode_mapel',
  'KELOMPOK': 'kelompok',

  // Jurusan
  'NAMA JURUSAN': 'nama_jurusan',
  'KODE JURUSAN': 'kode_jurusan',
  'SINGKATAN': 'singkatan',
  'PROGRAM KEAHLIAN': 'program_keahlian',

  // Guru Mapel / Kelas
  'NAMA GURU': 'nama_guru',
  'NAMA MAPEL': 'nama_mapel',
  'WALI KELAS': 'wali_kelas',
  'NAMA WALI KELAS': 'wali_kelas',

  // Produk Koperasi
  'BARCODE / KODE BARANG': 'code',
  'BARCODE': 'code',
  'KODE BARANG': 'code',
  'NAMA PRODUK': 'name',
  'NAMA BARANG': 'name',
  'KATEGORI': 'category',
  'HARGA JUAL': 'price',
  'HARGA MODAL': 'costPrice',
  'STOK AWAL': 'stock',
  'STOK': 'stock',
  'DESKRIPSI': 'description',
};

/**
 * Common Aliases to ensure compatibility between services
 */
const KEY_ALIASES: Record<string, string[]> = {
  'nama_jurusan': ['nama', 'jurusan'],
  'nama_guru': ['nama', 'nama_lengkap'],
  'nama_siswa': ['nama', 'nama_lengkap', 'nama_pendaftar', 'nama_calon_siswa'],
  'nama_mapel': ['mapel'],
  'kode_mapel': ['kode'],
  'kode_jurusan': ['kode'],
  'wali_kelas': ['nama_wali_kelas'],
  'jenis_kelamin': ['jk', 'gender'],
  'no_hp': ['no_telp', 'telepon', 'no_telepon', 'no_hp_wa', 'no_wa'],
  'jurusan': ['pilihan_1', 'pilihan_kompetensi', 'kompetensi_keahlian', 'nama_jurusan', 'pilihan_jurusan'],
  'sekolah_asal': ['asal_sekolah'],
  'no_ijazah_smp': ['no_seri_ijazah_smp', 'no_seri_ijazah', 'no_ijazah'],
  'tanggal_masuk': ['tgl_masuk', 'tanggal_masuk_(yyyy-mm-dd)', 'tgl_masuk_(yyyy-mm-dd)'],
  'tanggal_keluar': ['tgl_keluar', 'tanggal_keluar_(yyyy-mm-dd)', 'tgl_keluar_(yyyy-mm-dd)'],
  'tanggal_lahir': ['tgl_lahir', 'tanggal_lahir_(yyyy-mm-dd)', 'tgl_lahir_(yyyy-mm-dd)'],
};

/**
 * Smartly read an Excel sheet by finding the header row and mapping columns.
 */
export function smartReadSheet(ws: XLSX.WorkSheet): any[] {
  // 1. Read as AOA to find the header row
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  
  let headerRowIndex = -1;
  let detectedHeaders: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    // A row is a header if it contains known keywords or most cells are strings
    const strings = row.filter(cell => typeof cell === 'string' && cell.trim().length > 0);
    
    // Check if this row contains common headers
    const hasKnownHeader = row.some(cell => {
      const val = String(cell || '').toUpperCase();
      return Object.keys(HEADER_MAP).some(k => val === k || val.includes(k));
    });

    if (hasKnownHeader && strings.length >= 2) {
      headerRowIndex = i;
      detectedHeaders = row.map(cell => String(cell || '').trim().toUpperCase());
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback to first row if no header detected
    return XLSX.utils.sheet_to_json(ws);
  }

  // 2. Read the data rows
  const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { range: headerRowIndex + 1, header: 1 });
  
  // 3. Map to objects using our smart keys
  return rawData.map((row, dataIdx) => {
    const obj: any = {
      __rowNum: headerRowIndex + dataIdx + 2 // 1-indexed + header row + current index
    };
    detectedHeaders.forEach((header, colIdx) => {
      if (!header) return;
      
      // Use mapped key or fallback to snake_case of header
      const key = HEADER_MAP[header] || header.toLowerCase().replace(/\s+/g, '_');
      
      let val = row[colIdx];
      
      // Basic cleanup
      if (typeof val === 'string') val = val.trim();
      if (val === undefined) val = null;
      
      obj[key] = val;

      // Apply Aliases
      if (KEY_ALIASES[key]) {
        KEY_ALIASES[key].forEach(alias => {
          if (obj[alias] === undefined || obj[alias] === null) {
            obj[alias] = val;
          }
        });
      }
    });
    return obj;
  }).filter(obj => {
    // Filter out rows that have only __rowNum or where all data keys are null/empty
    const dataKeys = Object.keys(obj).filter(k => k !== '__rowNum');
    return dataKeys.some(key => {
      const v = obj[key];
      
      // Strict empty check
      if (v === null || v === undefined) return false;
      
      // Handle strings (trim and check length)
      if (typeof v === 'string') {
        return v.trim().length > 0;
      }
      
      // Handle objects (like empty cell objects from some parsers)
      if (typeof v === 'object' && !Array.isArray(v)) {
        return Object.keys(v).length > 0;
      }

      // Handle arrays
      if (Array.isArray(v)) {
        return v.length > 0;
      }
      
      // If it reaches here, it has some value (number 0, boolean, etc.)
      return true;
    });
  });
}
