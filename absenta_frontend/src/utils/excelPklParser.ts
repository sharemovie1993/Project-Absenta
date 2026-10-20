import * as XLSX from 'xlsx';

export interface RawExcelRow {
  NO?: number | string;
  NIS?: number | string;
  NISN?: string;
  'NISN '?: string;
  'NAMA SISWA'?: string;
  KELAS?: string;
  STATUS?: string;
  'TEMPAT PKL'?: string;
  ALAMAT?: string;
  'DURASI PKL'?: string;
  'CONTACK PERSON'?: string;
  JABATAN?: string;
  'NO TELP'?: string;
  'PEMBIMBING SEKOLAH'?: string;
  'PEMBIMBING SEKOLAH '?: string;
  NIP?: string;
  'NIP '?: string;
  'NO HP'?: string;
  [key: string]: any;
}

export interface MatchedPklRow {
  row_id: string;
  no: number;
  nisn: string;
  nis: string;
  nama_siswa_excel: string;
  kelas_excel: string;
  status_excel: string;
  tempat_pkl_excel: string;
  alamat_excel: string;
  durasi_excel: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  pembimbing_excel: string;
  nip_excel: string;
  kontak_person_excel?: string;
  jabatan_person_excel?: string;
  no_telp_excel?: string;

  // Resolved DB entities
  siswa_id: string | null;
  siswa_db_nama: string | null;
  siswa_match_type: 'NISN_EXACT' | 'NIS_EXACT' | 'NAME_FUZZY' | 'MANUAL' | 'UNMATCHED';

  mitra_id: string | null;
  mitra_db_nama: string | null;
  mitra_match_type: 'EXACT' | 'FUZZY' | 'NEW' | 'MANUAL';

  pembimbing_id: string | null;
  pembimbing_db_nama: string | null;
  pembimbing_match_type: 'NIP_EXACT' | 'NAME_FUZZY' | 'MANUAL' | 'UNMATCHED';

  is_ready: boolean;
}

export interface UniqueIdukaMapping {
  iduka_name: string;
  alamat: string;
  siswa_count: number;
  mitra_id: string | null;
  mitra_db_nama: string | null;
  match_type: 'EXACT' | 'FUZZY' | 'NEW' | 'MANUAL';
  action: 'USE_EXISTING' | 'CREATE_NEW';
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  jun: '06',
  jul: '07',
  agu: '08',
  agt: '08',
  sep: '09',
  okt: '10',
  nov: '11',
  des: '12',
};

/**
 * Parsing durasi PKL bahasa Indonesia seperti:
 * "29 JUNI - 16 OKTOBER 2026" atau "1 JULI 2026 - 31 OKTOBER 2026"
 */
export function parseIndonesianDateRange(rawDuration?: string): { tanggal_mulai: string; tanggal_selesai: string | null } {
  const currentYear = new Date().getFullYear();
  const defaultMulai = `${currentYear}-07-01`;
  const defaultSelesai = `${currentYear}-10-31`;

  if (!rawDuration || typeof rawDuration !== 'string' || !rawDuration.trim()) {
    return { tanggal_mulai: defaultMulai, tanggal_selesai: defaultSelesai };
  }

  const cleaned = rawDuration.trim().toLowerCase();
  const parts = cleaned.split(/\s*[-–—]|(?:\s+s\/?d\s+)|\s+sampai\s+/i);

  if (parts.length < 2) {
    return { tanggal_mulai: defaultMulai, tanggal_selesai: defaultSelesai };
  }

  // Cari tahun di bagian kanan
  const yearMatch = parts[1].match(/\b(20\d{2})\b/);
  const detectedYear = yearMatch ? yearMatch[1] : String(currentYear);

  const parsePart = (text: string, fallbackYear: string): string | null => {
    const trimmed = text.trim();
    // Cek jika sudah format YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

    // Cek format: 29 JUNI 2026 atau 29 JUNI
    const words = trimmed.split(/\s+/);
    let day = '01';
    let month = '07';
    let year = fallbackYear;

    for (const w of words) {
      if (/^\d{1,2}$/.test(w)) {
        day = w.padStart(2, '0');
      } else if (/^\d{4}$/.test(w)) {
        year = w;
      } else if (INDONESIAN_MONTHS[w]) {
        month = INDONESIAN_MONTHS[w];
      }
    }

    return `${year}-${month}-${day}`;
  };

  const startIso = parsePart(parts[0], detectedYear) || defaultMulai;
  const endIso = parsePart(parts[1], detectedYear) || defaultSelesai;

  return {
    tanggal_mulai: startIso,
    tanggal_selesai: endIso,
  };
}

export function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function cleanNip(val: any): string {
  return cleanString(val).replace(/\s+/g, '');
}

export function cleanGuruName(val: string): string {
  return val
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\b(s\.pd|s\.pd\.gr|s\.h|m\.pd|s\.kom|s\.t|s\.e|a\.md|a\.md\.t|dr|dra|drs|gr)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanMitraName(val: string): string {
  return val
    .toLowerCase()
    .replace(/^(pt\.|pt|cv\.|cv|bengkel|toko|kantor|desa|kecamatan|dinas|studio|ahass)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ParsedWorkbookResult {
  sheetNames: string[];
  selectedSheet: string;
  rows: RawExcelRow[];
}

/**
 * Membaca file Excel dan mengembalikan daftar sheet serta baris dari sheet yang dipilih
 */
export async function parseExcelWorkbook(file: File, targetSheetName?: string): Promise<ParsedWorkbookResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetNames = wb.SheetNames;

  let selectedSheet = targetSheetName && sheetNames.includes(targetSheetName)
    ? targetSheetName
    : sheetNames.find((s) => s.toLowerCase().includes('iduka') || s.toLowerCase().includes('pemetaan')) || sheetNames[0];

  const sheet = wb.Sheets[selectedSheet];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  // Normalisasi kunci header (trim trailing/leading whitespace)
  const normalizedRows: RawExcelRow[] = rawJson.map((row) => {
    const cleanedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      cleanedRow[k.trim()] = row[k];
    });
    return cleanedRow as RawExcelRow;
  });

  return {
    sheetNames,
    selectedSheet,
    rows: normalizedRows,
  };
}

export interface SiswaDbCandidate {
  id: string;
  nisn: string | null;
  nis: string | null;
  nama_siswa: string;
  kelas_nama?: string;
}

export interface MitraDbCandidate {
  id: string;
  nama: string;
  alamat?: string | null;
}

export interface GuruDbCandidate {
  id: string;
  nip: string | null;
  nama_guru: string;
}

/**
 * Smart matching rows Excel terhadap database
 */
export function matchExcelRows(
  rows: RawExcelRow[],
  siswaList: SiswaDbCandidate[],
  mitraList: MitraDbCandidate[],
  guruList: GuruDbCandidate[]
): MatchedPklRow[] {
  // 1. Indeks DB Siswa
  const siswaByNisn = new Map<string, SiswaDbCandidate>();
  const siswaByNis = new Map<string, SiswaDbCandidate>();
  siswaList.forEach((s) => {
    if (s.nisn && s.nisn.trim()) siswaByNisn.set(s.nisn.trim(), s);
    if (s.nis && s.nis.trim()) siswaByNis.set(s.nis.trim(), s);
  });

  // 2. Indeks DB Mitra
  const mitraByExactName = new Map<string, MitraDbCandidate>();
  mitraList.forEach((m) => {
    mitraByExactName.set(m.nama.trim().toLowerCase(), m);
  });

  // 3. Indeks DB Guru
  const guruByNip = new Map<string, GuruDbCandidate>();
  guruList.forEach((g) => {
    if (g.nip) guruByNip.set(cleanNip(g.nip), g);
  });

  return rows.map((r, idx) => {
    const rowId = `row-${idx + 1}-${Date.now()}`;
    const rawNisn = cleanString(r.NISN || r['NISN '] || '');
    const rawNis = cleanString(r.NIS || '');
    const rawNamaSiswa = cleanString(r['NAMA SISWA'] || '');
    const rawTempatPkl = cleanString(r['TEMPAT PKL'] || '');
    const rawAlamat = cleanString(r.ALAMAT || '');
    const rawDurasi = cleanString(r['DURASI PKL'] || '');
    const rawPembimbing = cleanString(r['PEMBIMBING SEKOLAH'] || r['PEMBIMBING SEKOLAH '] || '');
    const rawNip = cleanNip(r.NIP || r['NIP '] || '');

    // Resolusi Siswa
    let matchedSiswa: SiswaDbCandidate | null = null;
    let siswaMatchType: MatchedPklRow['siswa_match_type'] = 'UNMATCHED';

    if (rawNisn && siswaByNisn.has(rawNisn)) {
      matchedSiswa = siswaByNisn.get(rawNisn)!;
      siswaMatchType = 'NISN_EXACT';
    } else if (rawNis && siswaByNis.has(rawNis)) {
      matchedSiswa = siswaByNis.get(rawNis)!;
      siswaMatchType = 'NIS_EXACT';
    } else if (rawNamaSiswa) {
      const cleanRawName = cleanGuruName(rawNamaSiswa);
      const found = siswaList.find((s) => {
        const cleanDb = cleanGuruName(s.nama_siswa);
        return cleanDb === cleanRawName || (cleanRawName.length > 5 && cleanDb.includes(cleanRawName));
      });
      if (found) {
        matchedSiswa = found;
        siswaMatchType = 'NAME_FUZZY';
      }
    }

    // Resolusi Mitra DU/DI
    let matchedMitra: MitraDbCandidate | null = null;
    let mitraMatchType: MatchedPklRow['mitra_match_type'] = 'NEW';

    if (rawTempatPkl) {
      const exact = mitraByExactName.get(rawTempatPkl.toLowerCase());
      if (exact) {
        matchedMitra = exact;
        mitraMatchType = 'EXACT';
      } else {
        const cleanRawMitra = cleanMitraName(rawTempatPkl);
        const partial = mitraList.find((m) => {
          const cleanDbMitra = cleanMitraName(m.nama);
          return (
            cleanDbMitra === cleanRawMitra ||
            (cleanRawMitra.length > 4 && (cleanDbMitra.includes(cleanRawMitra) || cleanRawMitra.includes(cleanDbMitra)))
          );
        });
        if (partial) {
          matchedMitra = partial;
          mitraMatchType = 'FUZZY';
        } else {
          mitraMatchType = 'NEW';
        }
      }
    }

    // Resolusi Pembimbing Guru
    let matchedGuru: GuruDbCandidate | null = null;
    let pembimbingMatchType: MatchedPklRow['pembimbing_match_type'] = 'UNMATCHED';

    if (rawNip && rawNip.length > 5 && guruByNip.has(rawNip)) {
      matchedGuru = guruByNip.get(rawNip)!;
      pembimbingMatchType = 'NIP_EXACT';
    } else if (rawPembimbing) {
      const cleanRawGuru = cleanGuruName(rawPembimbing);
      const found = guruList.find((g) => {
        const cleanDbGuru = cleanGuruName(g.nama_guru);
        return (
          cleanDbGuru === cleanRawGuru ||
          (cleanRawGuru.length > 4 && (cleanDbGuru.includes(cleanRawGuru) || cleanRawGuru.includes(cleanDbGuru)))
        );
      });
      if (found) {
        matchedGuru = found;
        pembimbingMatchType = 'NAME_FUZZY';
      }
    }

    // Tanggal
    const dates = parseIndonesianDateRange(rawDurasi);

    const isReady = !!matchedSiswa?.id && (!!matchedMitra?.id || !!rawTempatPkl);

    return {
      row_id: rowId,
      no: typeof r.NO === 'number' ? r.NO : idx + 1,
      nisn: rawNisn,
      nis: rawNis,
      nama_siswa_excel: rawNamaSiswa,
      kelas_excel: cleanString(r.KELAS || ''),
      status_excel: cleanString(r.STATUS || 'DITERIMA'),
      tempat_pkl_excel: rawTempatPkl,
      alamat_excel: rawAlamat,
      durasi_excel: rawDurasi,
      tanggal_mulai: dates.tanggal_mulai,
      tanggal_selesai: dates.tanggal_selesai,
      pembimbing_excel: rawPembimbing,
      nip_excel: rawNip,
      kontak_person_excel: cleanString(r['CONTACK PERSON'] || ''),
      jabatan_person_excel: cleanString(r.JABATAN || ''),
      no_telp_excel: cleanString(r['NO TELP'] || r['NO HP'] || ''),

      siswa_id: matchedSiswa?.id || null,
      siswa_db_nama: matchedSiswa?.nama_siswa || null,
      siswa_match_type: siswaMatchType,

      mitra_id: matchedMitra?.id || null,
      mitra_db_nama: matchedMitra?.nama || null,
      mitra_match_type: mitraMatchType,

      pembimbing_id: matchedGuru?.id || null,
      pembimbing_db_nama: matchedGuru?.nama_guru || null,
      pembimbing_match_type: pembimbingMatchType,

      is_ready: isReady,
    };
  });
}

/**
 * Ekstraksi daftar IDUKA unik dari berkas Excel untuk proses revisi terpisah
 */
export function extractUniqueIdukaMappings(
  rows: RawExcelRow[],
  mitraList: MitraDbCandidate[]
): UniqueIdukaMapping[] {
  const map = new Map<string, { alamat: string; count: number }>();

  rows.forEach((r) => {
    const rawName = cleanString(r['TEMPAT PKL'] || '');
    if (!rawName) return;
    const existing = map.get(rawName);
    const alamat = cleanString(r.ALAMAT || '');
    if (existing) {
      existing.count++;
      if (!existing.alamat && alamat) existing.alamat = alamat;
    } else {
      map.set(rawName, { alamat, count: 1 });
    }
  });

  const mitraByExactName = new Map<string, MitraDbCandidate>();
  mitraList.forEach((m) => {
    mitraByExactName.set(m.nama.trim().toLowerCase(), m);
  });

  const results: UniqueIdukaMapping[] = [];

  for (const [idukaName, meta] of map.entries()) {
    let matchedMitra: MitraDbCandidate | null = null;
    let matchType: UniqueIdukaMapping['match_type'] = 'NEW';
    let action: UniqueIdukaMapping['action'] = 'CREATE_NEW';

    const exact = mitraByExactName.get(idukaName.toLowerCase());
    if (exact) {
      matchedMitra = exact;
      matchType = 'EXACT';
      action = 'USE_EXISTING';
    } else {
      const cleanRawMitra = cleanMitraName(idukaName);
      const partial = mitraList.find((m) => {
        const cleanDbMitra = cleanMitraName(m.nama);
        return (
          cleanDbMitra === cleanRawMitra ||
          (cleanRawMitra.length > 4 && (cleanDbMitra.includes(cleanRawMitra) || cleanRawMitra.includes(cleanDbMitra)))
        );
      });
      if (partial) {
        matchedMitra = partial;
        matchType = 'FUZZY';
        action = 'USE_EXISTING';
      } else {
        matchType = 'NEW';
        action = 'CREATE_NEW';
      }
    }

    results.push({
      iduka_name: idukaName,
      alamat: meta.alamat,
      siswa_count: meta.count,
      mitra_id: matchedMitra?.id || null,
      mitra_db_nama: matchedMitra?.nama || null,
      match_type: matchType,
      action: action,
    });
  }

  return results.sort((a, b) => b.siswa_count - a.siswa_count);
}

/**
 * Sinkronisasi hasil revisi IDUKA ke seluruh baris penempatan siswa
 */
export function applyIdukaMappingsToRows(
  rows: MatchedPklRow[],
  idukaMappings: UniqueIdukaMapping[]
): MatchedPklRow[] {
  const map = new Map<string, UniqueIdukaMapping>();
  idukaMappings.forEach((im) => {
    map.set(im.iduka_name, im);
  });

  return rows.map((r) => {
    const im = map.get(r.tempat_pkl_excel);
    if (!im) return r;

    let newMitraId: string | null = null;
    let newMitraDbNama: string | null = null;
    let newMatchType: MatchedPklRow['mitra_match_type'] = 'NEW';

    if (im.action === 'USE_EXISTING' && im.mitra_id) {
      newMitraId = im.mitra_id;
      newMitraDbNama = im.mitra_db_nama;
      newMatchType = im.match_type;
    } else {
      newMitraId = null;
      newMitraDbNama = null;
      newMatchType = 'NEW';
    }

    return {
      ...r,
      mitra_id: newMitraId,
      mitra_db_nama: newMitraDbNama,
      mitra_match_type: newMatchType,
      is_ready: !!r.siswa_id && (!!newMitraId || !!r.tempat_pkl_excel),
    };
  });
}
