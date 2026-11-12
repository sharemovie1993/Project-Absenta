import { StudentScoreItem } from '../types/inputNilai.types';
import {
  cleanExcelCell,
  normalizeCode,
  stripLeadingZeros,
  collapseSpaces,
  normalizeName,
  normalizeNameLoose,
} from './siswaExcelCompare';

export type GradeColumnType =
  | 'NO'
  | 'NIS'
  | 'NISN'
  | 'NAMA'
  | 'SUMATIF_1'
  | 'SUMATIF_2'
  | 'SUMATIF_3'
  | 'SUMATIF_4'
  | 'RATA2'
  | 'SUMATIF_AKHIR'
  | 'NILAI_RAPOR'
  | 'DESKRIPSI_CP'
  | 'NILAI'
  | 'DESKRIPSI'
  | 'UNKNOWN';

export interface ParsedExcelGradeRow {
  rowNumber: number; // 1-based row index in paste
  nis: string;
  nisn: string;
  nama: string;
  sumatif_1?: number | null;
  sumatif_2?: number | null;
  sumatif_3?: number | null;
  sumatif_4?: number | null;
  sumatif_akhir?: number | null;
  deskripsi_cp?: string;
  nilai?: number | null;
  deskripsi?: string;
  rawCells: string[];
}

export interface DetectedGradeColumn {
  index: number;
  label: string;
  type: GradeColumnType;
}

export interface ParsedExcelGradeOutput {
  rows: ParsedExcelGradeRow[];
  headerDetected: boolean;
  columns: DetectedGradeColumn[];
  delimiter: 'TAB' | 'SEMICOLON' | 'COMMA';
  skippedEmptyRows: number;
}

export type CompareGradeStatus = 'COCOK' | 'NILAI_BERUBAH' | 'HANYA_DI_EXCEL' | 'BELUM_DINILAI';

export interface GradeDiffFlags {
  sumatif_1: boolean;
  sumatif_2: boolean;
  sumatif_3: boolean;
  sumatif_4: boolean;
  sumatif_akhir: boolean;
  deskripsi_cp: boolean;
  nilai: boolean;
  deskripsi: boolean;
}

export interface CompareGradeRowResult {
  key: string;
  status: CompareGradeStatus;
  excelRow?: ParsedExcelGradeRow;
  systemStudent?: StudentScoreItem;
  diffs: GradeDiffFlags;
  matchMethod?: 'NIS' | 'NAMA' | 'SIMILARITY';
  note?: string;
  selectedToApply: boolean;
}

export interface CompareGradeSummary {
  totalExcel: number;
  totalSistem: number;
  siapTerapkan: number;
  nilaiBerubah: number;
  hanyaDiExcel: number;
  belumDinilai: number;
  duplicateExcelNis: string[];
}

export interface CompareGradeOutput {
  results: CompareGradeRowResult[];
  summary: CompareGradeSummary;
}

// Levenshtein Similarity calculation (0.0 to 1.0)
function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;

  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }

  return 1 - dp[n] / Math.max(m, n);
}

// Normalize numeric score string to float 0-100 or null
export function parseScoreValue(raw: string | null | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const clean = cleanExcelCell(raw).replace(',', '.');
  if (clean === '' || clean === '-') return null;
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num * 10) / 10));
}

// Split a line based on delimiter
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((c) => cleanExcelCell(c));
  }
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(cleanExcelCell(current));
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(cleanExcelCell(current));
  return cells;
}

// Detect delimiter from sample lines
function detectDelimiter(lines: string[]): { char: string; label: 'TAB' | 'SEMICOLON' | 'COMMA' } {
  const sample = lines.slice(0, 10).join('\n');
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;

  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
    return { char: '\t', label: 'TAB' };
  }
  if (semiCount > commaCount && semiCount > 0) {
    return { char: ';', label: 'SEMICOLON' };
  }
  return { char: ',', label: 'COMMA' };
}

// Heuristic column classification based on header title
function classifyColumnHeader(headerText: string, entryMode: 'sumatif' | 'kategori'): GradeColumnType {
  const h = headerText.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

  if (h === 'no' || h === 'nomor' || h === 'num' || h === '#') return 'NO';
  if (h.includes('nisn')) return 'NISN';
  if (h === 'nis' || h.startsWith('nis ') || h.endsWith(' nis') || h.includes('induk')) return 'NIS';
  if (h.includes('nama') || h.includes('siswa') || h.includes('peserta')) return 'NAMA';

  if (entryMode === 'sumatif') {
    if (h.includes('sumatif 1') || h === 's1' || h.includes('sum 1') || h.includes('uh 1') || h.includes('tp 1') || h.includes('tugas 1')) {
      return 'SUMATIF_1';
    }
    if (h.includes('sumatif 2') || h === 's2' || h.includes('sum 2') || h.includes('uh 2') || h.includes('tp 2') || h.includes('tugas 2')) {
      return 'SUMATIF_2';
    }
    if (h.includes('sumatif 3') || h === 's3' || h.includes('sum 3') || h.includes('uh 3') || h.includes('tp 3') || h.includes('tugas 3')) {
      return 'SUMATIF_3';
    }
    if (h.includes('sumatif 4') || h === 's4' || h.includes('sum 4') || h.includes('uh 4') || h.includes('tp 4') || h.includes('tugas 4')) {
      return 'SUMATIF_4';
    }
    if (h.includes('rata') || h.includes('avg') || h.includes('rerata')) return 'RATA2';
    if (
      h.includes('sumatif akhir') ||
      h.includes('sas') ||
      h.includes('asat') ||
      h.includes('pas') ||
      h.includes('uas') ||
      h === 'sa' ||
      h.includes('ujian akhir')
    ) {
      return 'SUMATIF_AKHIR';
    }
    if (h.includes('rapor') || h.includes('final') || h.includes('nilai akhir')) return 'NILAI_RAPOR';
    if (h.includes('cp') || h.includes('capaian') || h.includes('kompetensi') || h.includes('deskripsi') || h.includes('catatan')) {
      return 'DESKRIPSI_CP';
    }
  } else {
    if (h.includes('nilai') || h.includes('skor') || h.includes('angka') || h.includes('point')) return 'NILAI';
    if (h.includes('deskripsi') || h.includes('catatan') || h.includes('keterangan')) return 'DESKRIPSI';
  }

  return 'UNKNOWN';
}

// Parse pasted raw text into structured grade rows with column mappings
export function parsePastedExcelGrades(
  rawText: string,
  entryMode: 'sumatif' | 'kategori' = 'sumatif'
): ParsedExcelGradeOutput {
  if (!rawText || !rawText.trim()) {
    return {
      rows: [],
      headerDetected: false,
      columns: [],
      delimiter: 'TAB',
      skippedEmptyRows: 0,
    };
  }

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trimEnd());
  const delimiterInfo = detectDelimiter(rawLines);
  const nonEmptyLines = rawLines.filter((l) => l.trim().length > 0);
  const skippedEmptyRows = rawLines.length - nonEmptyLines.length;

  if (nonEmptyLines.length === 0) {
    return {
      rows: [],
      headerDetected: false,
      columns: [],
      delimiter: delimiterInfo.label,
      skippedEmptyRows,
    };
  }

  // Parse lines into cell arrays
  const parsedLines = nonEmptyLines.map((line) => splitLine(line, delimiterInfo.char));

  // Detect header row
  const firstLine = parsedLines[0];
  const headerKeywords = ['nama', 'nis', 'sumatif', 'sum', 'uh', 'tugas', 'tp', 'nilai', 'capaian', 'cp', 'akhir', 'sas', 'asat', 'pas', 'no', 'siswa'];
  const matchesHeaderKeywords = firstLine.filter((cell) =>
    headerKeywords.some((kw) => cell.toLowerCase().includes(kw))
  ).length;

  const headerDetected = matchesHeaderKeywords >= 2 || (firstLine.length <= 3 && matchesHeaderKeywords >= 1);

  let columnConfigs: DetectedGradeColumn[] = [];
  let dataRowsStart = 0;

  if (headerDetected) {
    dataRowsStart = 1;
    columnConfigs = firstLine.map((headerText, idx) => ({
      index: idx,
      label: headerText || `Kolom ${idx + 1}`,
      type: classifyColumnHeader(headerText, entryMode),
    }));
  } else {
    // Infer column mappings from first data row
    dataRowsStart = 0;
    const sampleRow = parsedLines[0];
    let foundName = false;
    let foundNis = false;
    let numericCount = 0;

    columnConfigs = sampleRow.map((cell, idx) => {
      const clean = cleanExcelCell(cell);
      const isDigitsOnly = /^\d+$/.test(clean);
      const numVal = parseFloat(clean.replace(',', '.'));
      const isScore = !isNaN(numVal) && numVal >= 0 && numVal <= 100;

      // First column is a sequence index 1, 2, 3...
      if (idx === 0 && isDigitsOnly && clean.length <= 3 && parseInt(clean, 10) <= 2) {
        return { index: idx, label: 'No', type: 'NO' as GradeColumnType };
      }

      // NIS: 8-12 digits
      if (!foundNis && isDigitsOnly && clean.length >= 6 && clean.length <= 16) {
        foundNis = true;
        return { index: idx, label: 'NIS', type: 'NIS' as GradeColumnType };
      }

      // Nama: text with letters and length > 3
      if (!foundName && /[a-zA-Z]/.test(clean) && clean.length >= 3 && isNaN(numVal)) {
        foundName = true;
        return { index: idx, label: 'Nama Siswa', type: 'NAMA' as GradeColumnType };
      }

      // Grades after Nama
      if (foundName && isScore) {
        numericCount++;
        if (entryMode === 'sumatif') {
          if (numericCount === 1) return { index: idx, label: 'Sumatif 1', type: 'SUMATIF_1' as GradeColumnType };
          if (numericCount === 2) return { index: idx, label: 'Sumatif 2', type: 'SUMATIF_2' as GradeColumnType };
          if (numericCount === 3) return { index: idx, label: 'Sumatif 3', type: 'SUMATIF_3' as GradeColumnType };
          if (numericCount === 4) return { index: idx, label: 'Sumatif 4', type: 'SUMATIF_4' as GradeColumnType };
          if (numericCount === 5) return { index: idx, label: 'Sumatif Akhir', type: 'SUMATIF_AKHIR' as GradeColumnType };
        } else {
          if (numericCount === 1) return { index: idx, label: 'Nilai', type: 'NILAI' as GradeColumnType };
        }
      }

      // Text after grades
      if (foundName && numericCount > 0 && /[a-zA-Z]/.test(clean)) {
        if (entryMode === 'sumatif') {
          return { index: idx, label: 'Capaian Kompetensi', type: 'DESKRIPSI_CP' as GradeColumnType };
        } else {
          return { index: idx, label: 'Deskripsi Rapor', type: 'DESKRIPSI' as GradeColumnType };
        }
      }

      return { index: idx, label: `Kolom ${idx + 1}`, type: 'UNKNOWN' as GradeColumnType };
    });
  }

  // Build structured student grade rows
  const rows: ParsedExcelGradeRow[] = [];

  for (let r = dataRowsStart; r < parsedLines.length; r++) {
    const cells = parsedLines[r];
    // Skip if row is completely empty
    if (cells.every((c) => !c || c.trim() === '')) continue;

    const rowObj: ParsedExcelGradeRow = {
      rowNumber: r + 1,
      nis: '',
      nisn: '',
      nama: '',
      rawCells: cells,
    };

    cells.forEach((cellVal, cIdx) => {
      const colConf = columnConfigs[cIdx];
      if (!colConf) return;

      switch (colConf.type) {
        case 'NIS':
          rowObj.nis = normalizeCode(cellVal);
          break;
        case 'NISN':
          rowObj.nisn = normalizeCode(cellVal);
          break;
        case 'NAMA':
          rowObj.nama = collapseSpaces(cellVal);
          break;
        case 'SUMATIF_1':
          rowObj.sumatif_1 = parseScoreValue(cellVal);
          break;
        case 'SUMATIF_2':
          rowObj.sumatif_2 = parseScoreValue(cellVal);
          break;
        case 'SUMATIF_3':
          rowObj.sumatif_3 = parseScoreValue(cellVal);
          break;
        case 'SUMATIF_4':
          rowObj.sumatif_4 = parseScoreValue(cellVal);
          break;
        case 'SUMATIF_AKHIR':
          rowObj.sumatif_akhir = parseScoreValue(cellVal);
          break;
        case 'DESKRIPSI_CP':
          rowObj.deskripsi_cp = cellVal ? cleanExcelCell(cellVal) : '';
          break;
        case 'NILAI':
          rowObj.nilai = parseScoreValue(cellVal);
          break;
        case 'DESKRIPSI':
          rowObj.deskripsi = cellVal ? cleanExcelCell(cellVal) : '';
          break;
      }
    });

    // Accept row if it contains either a name, NIS, or at least one score
    if (rowObj.nama || rowObj.nis || rowObj.sumatif_1 !== undefined || rowObj.nilai !== undefined) {
      rows.push(rowObj);
    }
  }

  return {
    rows,
    headerDetected,
    columns: columnConfigs,
    delimiter: delimiterInfo.label,
    skippedEmptyRows,
  };
}

// Compare parsed Excel rows against system students in the active class
export function compareGradesWithExcel(
  excelRows: ParsedExcelGradeRow[],
  systemStudents: StudentScoreItem[],
  entryMode: 'sumatif' | 'kategori' = 'sumatif',
  options: { ignoreCaseNama?: boolean } = {}
): CompareGradeOutput {
  const ignoreCase = options.ignoreCaseNama ?? true;

  // Build index maps for fast student resolution
  const sysByNis = new Map<string, StudentScoreItem>();
  const sysByNisStripped = new Map<string, StudentScoreItem>();
  const sysByNameNorm = new Map<string, StudentScoreItem>();
  const sysByNameLoose = new Map<string, StudentScoreItem>();

  systemStudents.forEach((st) => {
    if (st.nis) {
      const code = normalizeCode(st.nis);
      sysByNis.set(code, st);
      const stripped = stripLeadingZeros(code);
      if (stripped) sysByNisStripped.set(stripped, st);
    }
    if (st.nama) {
      sysByNameNorm.set(normalizeName(st.nama, ignoreCase), st);
      sysByNameLoose.set(normalizeNameLoose(st.nama), st);
    }
  });

  const matchedSystemStudentIds = new Set<string>();
  const duplicateExcelNis = new Set<string>();
  const seenExcelNis = new Set<string>();

  const results: CompareGradeRowResult[] = [];

  // 1. Process Excel rows
  excelRows.forEach((ex) => {
    if (ex.nis) {
      if (seenExcelNis.has(ex.nis)) duplicateExcelNis.add(ex.nis);
      else seenExcelNis.add(ex.nis);
    }

    let match: StudentScoreItem | undefined;
    let matchMethod: 'NIS' | 'NAMA' | 'SIMILARITY' | undefined;

    // Match Strategy 1: Exact NIS
    if (ex.nis && sysByNis.has(ex.nis)) {
      match = sysByNis.get(ex.nis);
      matchMethod = 'NIS';
    }

    // Match Strategy 2: Stripped Leading Zero NIS
    if (!match && ex.nis) {
      const stripped = stripLeadingZeros(ex.nis);
      if (stripped && sysByNisStripped.has(stripped)) {
        match = sysByNisStripped.get(stripped);
        matchMethod = 'NIS';
      }
    }

    // Match Strategy 3: Normalized Name
    if (!match && ex.nama) {
      const norm = normalizeName(ex.nama, ignoreCase);
      if (sysByNameNorm.has(norm)) {
        match = sysByNameNorm.get(norm);
        matchMethod = 'NAMA';
      }
    }

    // Match Strategy 4: Loose Name (without punctuation)
    if (!match && ex.nama) {
      const loose = normalizeNameLoose(ex.nama);
      if (sysByNameLoose.has(loose)) {
        match = sysByNameLoose.get(loose);
        matchMethod = 'NAMA';
      }
    }

    // Match Strategy 5: Fuzzy Similarity (threshold >= 0.82)
    if (!match && ex.nama && ex.nama.length >= 4) {
      const exLoose = normalizeNameLoose(ex.nama);
      let bestSim = 0;
      let bestMatch: StudentScoreItem | undefined;

      systemStudents.forEach((st) => {
        const stLoose = normalizeNameLoose(st.nama);
        const sim = levenshteinSimilarity(exLoose, stLoose);
        if (sim > bestSim && sim >= 0.82) {
          bestSim = sim;
          bestMatch = st;
        }
      });

      if (bestMatch) {
        match = bestMatch;
        matchMethod = 'SIMILARITY';
      }
    }

    // If matched with student
    if (match) {
      matchedSystemStudentIds.add(match.siswa_id);

      const diffs: GradeDiffFlags = {
        sumatif_1: false,
        sumatif_2: false,
        sumatif_3: false,
        sumatif_4: false,
        sumatif_akhir: false,
        deskripsi_cp: false,
        nilai: false,
        deskripsi: false,
      };

      let hasChanges = false;

      if (entryMode === 'sumatif') {
        if (ex.sumatif_1 !== undefined && ex.sumatif_1 !== null) {
          const sysVal = match.sumatif_1 !== null && match.sumatif_1 !== undefined && match.sumatif_1 !== '' ? Number(match.sumatif_1) : null;
          if (sysVal !== ex.sumatif_1) {
            diffs.sumatif_1 = true;
            hasChanges = true;
          }
        }
        if (ex.sumatif_2 !== undefined && ex.sumatif_2 !== null) {
          const sysVal = match.sumatif_2 !== null && match.sumatif_2 !== undefined && match.sumatif_2 !== '' ? Number(match.sumatif_2) : null;
          if (sysVal !== ex.sumatif_2) {
            diffs.sumatif_2 = true;
            hasChanges = true;
          }
        }
        if (ex.sumatif_3 !== undefined && ex.sumatif_3 !== null) {
          const sysVal = match.sumatif_3 !== null && match.sumatif_3 !== undefined && match.sumatif_3 !== '' ? Number(match.sumatif_3) : null;
          if (sysVal !== ex.sumatif_3) {
            diffs.sumatif_3 = true;
            hasChanges = true;
          }
        }
        if (ex.sumatif_4 !== undefined && ex.sumatif_4 !== null) {
          const sysVal = match.sumatif_4 !== null && match.sumatif_4 !== undefined && match.sumatif_4 !== '' ? Number(match.sumatif_4) : null;
          if (sysVal !== ex.sumatif_4) {
            diffs.sumatif_4 = true;
            hasChanges = true;
          }
        }
        if (ex.sumatif_akhir !== undefined && ex.sumatif_akhir !== null) {
          const sysVal = match.sumatif_akhir !== null && match.sumatif_akhir !== undefined && match.sumatif_akhir !== '' ? Number(match.sumatif_akhir) : null;
          if (sysVal !== ex.sumatif_akhir) {
            diffs.sumatif_akhir = true;
            hasChanges = true;
          }
        }
        if (ex.deskripsi_cp !== undefined && ex.deskripsi_cp.trim() !== '') {
          const sysVal = (match.deskripsi_cp || '').trim();
          if (sysVal !== ex.deskripsi_cp.trim()) {
            diffs.deskripsi_cp = true;
            hasChanges = true;
          }
        }
      } else {
        if (ex.nilai !== undefined && ex.nilai !== null) {
          const sysVal = match.nilai !== null && match.nilai !== undefined && match.nilai !== '' ? Number(match.nilai) : null;
          if (sysVal !== ex.nilai) {
            diffs.nilai = true;
            hasChanges = true;
          }
        }
        if (ex.deskripsi !== undefined && ex.deskripsi.trim() !== '') {
          const sysVal = (match.deskripsi || '').trim();
          if (sysVal !== ex.deskripsi.trim()) {
            diffs.deskripsi = true;
            hasChanges = true;
          }
        }
      }

      results.push({
        key: `excel-${ex.rowNumber}-${match.siswa_id}`,
        status: hasChanges ? 'NILAI_BERUBAH' : 'COCOK',
        excelRow: ex,
        systemStudent: match,
        diffs,
        matchMethod,
        note: matchMethod === 'SIMILARITY' ? `Nama dicocokkan berdasarkan kemiripan bunyi/kata` : undefined,
        selectedToApply: true,
      });
    } else {
      // Excel row not found in class
      results.push({
        key: `excel-orphan-${ex.rowNumber}`,
        status: 'HANYA_DI_EXCEL',
        excelRow: ex,
        diffs: {
          sumatif_1: false,
          sumatif_2: false,
          sumatif_3: false,
          sumatif_4: false,
          sumatif_akhir: false,
          deskripsi_cp: false,
          nilai: false,
          deskripsi: false,
        },
        note: 'Siswa tidak ditemukan dalam daftar rombel aktif kelas ini',
        selectedToApply: false,
      });
    }
  });

  // 2. Identify system students who were NOT present in Excel paste
  systemStudents.forEach((st) => {
    if (!matchedSystemStudentIds.has(st.siswa_id)) {
      results.push({
        key: `sys-unmatched-${st.siswa_id}`,
        status: 'BELUM_DINILAI',
        systemStudent: st,
        diffs: {
          sumatif_1: false,
          sumatif_2: false,
          sumatif_3: false,
          sumatif_4: false,
          sumatif_akhir: false,
          deskripsi_cp: false,
          nilai: false,
          deskripsi: false,
        },
        note: 'Tidak ditemukan dalam data Excel yang ditempel (belum dinilai)',
        selectedToApply: false,
      });
    }
  });

  // Summary Counters
  const summary: CompareGradeSummary = {
    totalExcel: excelRows.length,
    totalSistem: systemStudents.length,
    siapTerapkan: results.filter((r) => r.status === 'COCOK' || r.status === 'NILAI_BERUBAH').length,
    nilaiBerubah: results.filter((r) => r.status === 'NILAI_BERUBAH').length,
    hanyaDiExcel: results.filter((r) => r.status === 'HANYA_DI_EXCEL').length,
    belumDinilai: results.filter((r) => r.status === 'BELUM_DINILAI').length,
    duplicateExcelNis: Array.from(duplicateExcelNis),
  };

  return { results, summary };
}
