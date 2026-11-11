import type { Siswa } from '../types/academic';

export type ExcelCompareColumnOrder = 'NISN_NIS_NAMA' | 'NIS_NISN_NAMA' | 'NAMA_NISN_NIS';

export type CompareResultStatus = 'COCOK' | 'BEDA_DATA' | 'HANYA_DI_EXCEL' | 'HANYA_DI_SISTEM';

export interface ParsedExcelStudentRow {
  rowNumber: number; // 1-based line number from pasted text
  nisn: string;
  nis: string;
  nama: string;
  rawCells: string[];
}

export interface ParsedExcelOutput {
  rows: ParsedExcelStudentRow[];
  delimiter: 'TAB' | 'SEMICOLON' | 'COMMA';
  headerDetected: boolean;
  detectedOrder?: ExcelCompareColumnOrder;
  skippedNoColumn: boolean;
  skippedEmptyRows: number;
}

export interface CompareDiffFlags {
  nisn: boolean;
  nis: boolean;
  nama: boolean;
  leadingZeroNisn: boolean;
  leadingZeroNis: boolean;
  caseOnlyNama: boolean;
}

export interface CompareRowResult {
  key: string;
  status: CompareResultStatus;
  excelRow?: ParsedExcelStudentRow;
  siswa?: Siswa;
  diffs: CompareDiffFlags;
  matchMethod?: 'NISN' | 'NIS' | 'NAMA' | 'SIMILARITY';
  note?: string;
}

export interface CompareSummary {
  totalExcel: number;
  totalSistem: number;
  cocok: number;
  bedaData: number;
  hanyaDiExcel: number;
  hanyaDiSistem: number;
  duplicateExcelNisn: string[];
  duplicateExcelNis: string[];
  duplicateSistemNisn: string[];
  duplicateSistemNis: string[];
}

export interface CompareKelasOutput {
  results: CompareRowResult[];
  summary: CompareSummary;
}

export function cleanExcelCell(value: string | null | undefined): string {
  if (!value) return '';
  const cleaned = value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^'+/, '')
    .trim();
  return cleaned === '-' ? '' : cleaned;
}

export function normalizeCode(value: string | null | undefined): string {
  return cleanExcelCell(value).replace(/\s+/g, '');
}

export function stripLeadingZeros(code: string): string {
  if (!code) return '';
  return code.replace(/^0+/, '') || code;
}

export function collapseSpaces(value: string | null | undefined): string {
  return cleanExcelCell(value).replace(/\s+/g, ' ');
}

export function normalizeName(value: string | null | undefined, ignoreCase = true): string {
  const collapsed = collapseSpaces(value);
  return ignoreCase ? collapsed.toLowerCase() : collapsed;
}

export function normalizeNameLoose(value: string | null | undefined): string {
  return collapseSpaces(value)
    .toLowerCase()
    .replace(/[.,'`’"()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function splitCsvLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((c) => c.trim());
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
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(lines: string[]): { char: string; label: 'TAB' | 'SEMICOLON' | 'COMMA' } {
  const sample = lines.slice(0, 10).join('\n');
  if (sample.includes('\t')) return { char: '\t', label: 'TAB' };
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  if (semiCount >= commaCount && semiCount > 0) return { char: ';', label: 'SEMICOLON' };
  if (commaCount > 0) return { char: ',', label: 'COMMA' };
  return { char: '\t', label: 'TAB' };
}

function getDefaultColumnMap(order: ExcelCompareColumnOrder, offset = 0): { nisn: number; nis: number; nama: number } {
  switch (order) {
    case 'NISN_NIS_NAMA':
      return { nisn: offset, nis: offset + 1, nama: offset + 2 };
    case 'NAMA_NISN_NIS':
      return { nama: offset, nisn: offset + 1, nis: offset + 2 };
    case 'NIS_NISN_NAMA':
    default:
      return { nis: offset, nisn: offset + 1, nama: offset + 2 };
  }
}

function detectHeaderMapping(cells: string[]): {
  isHeader: boolean;
  map?: { nisn: number; nis: number; nama: number };
  detectedOrder?: ExcelCompareColumnOrder;
  hasNoColumn?: boolean;
} {
  const lower = cells.map((c) => cleanExcelCell(c).toLowerCase());
  const nisnIdx = lower.findIndex((c) => c === 'nisn' || c.includes('nisn'));
  const nisIdx = lower.findIndex((c) => c === 'nis' || (c.includes('nis') && !c.includes('nisn') && !c.includes('jenis')));
  const namaIdx = lower.findIndex((c) => c.includes('nama'));
  const noIdx = lower.findIndex((c) => c === 'no' || c === 'no.' || c === '#' || c === 'urut');

  const matches = [nisnIdx !== -1, nisIdx !== -1, namaIdx !== -1].filter(Boolean).length;
  if (matches < 2) {
    return { isHeader: false };
  }

  let detectedOrder: ExcelCompareColumnOrder | undefined;
  if (nisnIdx !== -1 && nisIdx !== -1 && namaIdx !== -1) {
    if (nisnIdx < nisIdx && nisIdx < namaIdx) detectedOrder = 'NISN_NIS_NAMA';
    else if (nisIdx < nisnIdx && nisnIdx < namaIdx) detectedOrder = 'NIS_NISN_NAMA';
    else if (namaIdx < nisnIdx && nisnIdx < nisIdx) detectedOrder = 'NAMA_NISN_NIS';
  }

  return {
    isHeader: true,
    detectedOrder,
    hasNoColumn: noIdx === 0,
    map: {
      nisn: nisnIdx,
      nis: nisIdx,
      nama: namaIdx,
    },
  };
}

export function parsePastedExcelText(
  rawText: string,
  preferredOrder: ExcelCompareColumnOrder = 'NIS_NISN_NAMA'
): ParsedExcelOutput {
  const rawLines = rawText.split(/\r\n|\n|\r/);
  const nonEmptyEntries = rawLines
    .map((text, idx) => ({ text, lineNumber: idx + 1 }))
    .filter((item) => item.text.trim().length > 0);

  if (nonEmptyEntries.length === 0) {
    return {
      rows: [],
      delimiter: 'TAB',
      headerDetected: false,
      skippedNoColumn: false,
      skippedEmptyRows: rawLines.length - nonEmptyEntries.length,
    };
  }

  const delimiterInfo = detectDelimiter(nonEmptyEntries.map((e) => e.text));
  const parsedLines = nonEmptyEntries.map((entry) => ({
    lineNumber: entry.lineNumber,
    cells: splitCsvLine(entry.text, delimiterInfo.char),
  }));

  const firstHeaderCheck = detectHeaderMapping(parsedLines[0].cells);
  let startIdx = 0;
  let columnMap = getDefaultColumnMap(preferredOrder, 0);
  let skippedNoColumn = false;

  if (firstHeaderCheck.isHeader && firstHeaderCheck.map) {
    startIdx = 1;
    columnMap = firstHeaderCheck.map;
    skippedNoColumn = Boolean(firstHeaderCheck.hasNoColumn);
  } else {
    // Jika pengguna menyertakan kolom "No" (4+ kolom dan kolom pertama angka urut 1..999 serta kolom terakhir teks)
    const sampleRows = parsedLines.slice(0, 10);
    const allHaveFourPlus = sampleRows.every((r) => r.cells.length >= 4);
    const firstColIsSeq = sampleRows.every((r) => /^\d{1,3}\.?$/.test(cleanExcelCell(r.cells[0])));
    if (allHaveFourPlus && firstColIsSeq) {
      skippedNoColumn = true;
      columnMap = getDefaultColumnMap(preferredOrder, 1);
    }
  }

  const rows: ParsedExcelStudentRow[] = [];
  let skippedEmptyRows = rawLines.length - nonEmptyEntries.length;

  for (let i = startIdx; i < parsedLines.length; i++) {
    const { lineNumber, cells } = parsedLines[i];
    const nisn = columnMap.nisn >= 0 ? normalizeCode(cells[columnMap.nisn]) : '';
    const nis = columnMap.nis >= 0 ? normalizeCode(cells[columnMap.nis]) : '';
    const nama = columnMap.nama >= 0 ? collapseSpaces(cells[columnMap.nama]) : '';

    if (!nisn && !nis && !nama) {
      skippedEmptyRows++;
      continue;
    }

    rows.push({
      rowNumber: lineNumber,
      nisn,
      nis,
      nama,
      rawCells: cells,
    });
  }

  return {
    rows,
    delimiter: delimiterInfo.label,
    headerDetected: firstHeaderCheck.isHeader,
    detectedOrder: firstHeaderCheck.detectedOrder,
    skippedNoColumn,
    skippedEmptyRows,
  };
}

function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const val of values) {
    if (!val) continue;
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([val]) => val);
}

function buildDiffFlags(
  excel: ParsedExcelStudentRow,
  siswa: Siswa,
  ignoreCaseNama: boolean
): CompareDiffFlags {
  const exNisn = normalizeCode(excel.nisn);
  const dbNisn = normalizeCode(siswa.nisn);
  const exNis = normalizeCode(excel.nis);
  const dbNis = normalizeCode(siswa.nis);

  const nisnDiff = exNisn !== dbNisn;
  const nisDiff = exNis !== dbNis;

  const exNamaExact = collapseSpaces(excel.nama);
  const dbNamaExact = collapseSpaces(siswa.nama_siswa);
  const exNamaNorm = normalizeName(excel.nama, ignoreCaseNama);
  const dbNamaNorm = normalizeName(siswa.nama_siswa, ignoreCaseNama);
  const namaDiff = exNamaNorm !== dbNamaNorm;

  const leadingZeroNisn =
    nisnDiff && Boolean(exNisn) && Boolean(dbNisn) && stripLeadingZeros(exNisn) === stripLeadingZeros(dbNisn);
  const leadingZeroNis =
    nisDiff && Boolean(exNis) && Boolean(dbNis) && stripLeadingZeros(exNis) === stripLeadingZeros(dbNis);
  const caseOnlyNama =
    !namaDiff && exNamaExact.toLowerCase() === dbNamaExact.toLowerCase() && exNamaExact !== dbNamaExact;

  return {
    nisn: nisnDiff,
    nis: nisDiff,
    nama: namaDiff,
    leadingZeroNisn,
    leadingZeroNis,
    caseOnlyNama,
  };
}

export function compareKelasWithExcel(
  excelRows: ParsedExcelStudentRow[],
  dbStudents: Siswa[],
  options?: { ignoreCaseNama?: boolean }
): CompareKelasOutput {
  const ignoreCaseNama = options?.ignoreCaseNama ?? true;

  const matchedExcelIndices = new Set<number>();
  const matchedDbIndices = new Set<number>();
  const paired: Array<{
    excelIdx: number;
    dbIdx: number;
    method: 'NISN' | 'NIS' | 'NAMA' | 'SIMILARITY';
    note?: string;
  }> = [];

  const pairItems = (
    excelIdx: number,
    dbIdx: number,
    method: 'NISN' | 'NIS' | 'NAMA' | 'SIMILARITY',
    note?: string
  ) => {
    matchedExcelIndices.add(excelIdx);
    matchedDbIndices.add(dbIdx);
    paired.push({ excelIdx, dbIdx, method, note });
  };

  // Pass 1: Exact NISN
  for (let ei = 0; ei < excelRows.length; ei++) {
    const exNisn = normalizeCode(excelRows[ei].nisn);
    if (!exNisn) continue;
    const di = dbStudents.findIndex(
      (s, idx) => !matchedDbIndices.has(idx) && normalizeCode(s.nisn) === exNisn
    );
    if (di !== -1) pairItems(ei, di, 'NISN');
  }

  // Pass 2: Exact NIS
  for (let ei = 0; ei < excelRows.length; ei++) {
    if (matchedExcelIndices.has(ei)) continue;
    const exNis = normalizeCode(excelRows[ei].nis);
    if (!exNis) continue;
    const di = dbStudents.findIndex(
      (s, idx) => !matchedDbIndices.has(idx) && normalizeCode(s.nis) === exNis
    );
    if (di !== -1) pairItems(ei, di, 'NIS');
  }

  // Pass 3: Exact normalized Nama
  for (let ei = 0; ei < excelRows.length; ei++) {
    if (matchedExcelIndices.has(ei)) continue;
    const exNama = normalizeName(excelRows[ei].nama, true);
    if (!exNama) continue;
    const di = dbStudents.findIndex(
      (s, idx) => !matchedDbIndices.has(idx) && normalizeName(s.nama_siswa, true) === exNama
    );
    if (di !== -1) pairItems(ei, di, 'NAMA');
  }

  // Pass 4: Loose fallback (leading zero pada NISN/NIS atau kemiripan nama >= 82%)
  for (let ei = 0; ei < excelRows.length; ei++) {
    if (matchedExcelIndices.has(ei)) continue;
    const exNisnZero = stripLeadingZeros(normalizeCode(excelRows[ei].nisn));
    const exNisZero = stripLeadingZeros(normalizeCode(excelRows[ei].nis));
    const exNamaLoose = normalizeNameLoose(excelRows[ei].nama);

    let bestDbIdx = -1;
    let bestScore = 0;
    let reason = '';

    for (let di = 0; di < dbStudents.length; di++) {
      if (matchedDbIndices.has(di)) continue;
      const dbNisnZero = stripLeadingZeros(normalizeCode(dbStudents[di].nisn));
      const dbNisZero = stripLeadingZeros(normalizeCode(dbStudents[di].nis));

      if (exNisnZero && dbNisnZero && exNisnZero === dbNisnZero) {
        bestDbIdx = di;
        bestScore = 1;
        reason = 'Angka NISN sama (beda nol di depan)';
        break;
      }
      if (exNisZero && dbNisZero && exNisZero === dbNisZero) {
        bestDbIdx = di;
        bestScore = 1;
        reason = 'Angka NIS sama (beda nol di depan)';
        break;
      }

      if (exNamaLoose) {
        const dbNamaLoose = normalizeNameLoose(dbStudents[di].nama_siswa);
        const score = levenshteinSimilarity(exNamaLoose, dbNamaLoose);
        if (score >= 0.82 && score > bestScore) {
          bestScore = score;
          bestDbIdx = di;
          reason = `Kemiripan nama ${Math.round(score * 100)}%`;
        }
      }
    }

    if (bestDbIdx !== -1) {
      pairItems(ei, bestDbIdx, 'SIMILARITY', reason);
    }
  }

  const results: CompareRowResult[] = [];

  for (const item of paired) {
    const excelRow = excelRows[item.excelIdx];
    const siswa = dbStudents[item.dbIdx];
    const diffs = buildDiffFlags(excelRow, siswa, ignoreCaseNama);
    const hasDiff = diffs.nisn || diffs.nis || diffs.nama;

    results.push({
      key: `pair-${item.excelIdx}-${siswa.id}`,
      status: hasDiff ? 'BEDA_DATA' : 'COCOK',
      excelRow,
      siswa,
      diffs,
      matchMethod: item.method,
      note: item.note,
    });
  }

  for (let ei = 0; ei < excelRows.length; ei++) {
    if (matchedExcelIndices.has(ei)) continue;
    const excelRow = excelRows[ei];
    results.push({
      key: `excel-only-${ei}`,
      status: 'HANYA_DI_EXCEL',
      excelRow,
      diffs: {
        nisn: false,
        nis: false,
        nama: false,
        leadingZeroNisn: false,
        leadingZeroNis: false,
        caseOnlyNama: false,
      },
      note: 'Tidak ditemukan di kelas terpilih pada sistem',
    });
  }

  for (let di = 0; di < dbStudents.length; di++) {
    if (matchedDbIndices.has(di)) continue;
    const siswa = dbStudents[di];
    results.push({
      key: `db-only-${siswa.id}`,
      status: 'HANYA_DI_SISTEM',
      siswa,
      diffs: {
        nisn: false,
        nis: false,
        nama: false,
        leadingZeroNisn: false,
        leadingZeroNis: false,
        caseOnlyNama: false,
      },
      note: 'Terdaftar di sistem kelas ini, namun tidak ada di data Excel',
    });
  }

  // Prioritaskan ketidaksesuaian di bagian atas agar operator cepat memeriksa
  const statusPriority: Record<CompareResultStatus, number> = {
    BEDA_DATA: 0,
    HANYA_DI_EXCEL: 1,
    HANYA_DI_SISTEM: 2,
    COCOK: 3,
  };

  results.sort((a, b) => {
    const prioDiff = statusPriority[a.status] - statusPriority[b.status];
    if (prioDiff !== 0) return prioDiff;
    if (a.excelRow && b.excelRow) return a.excelRow.rowNumber - b.excelRow.rowNumber;
    if (a.siswa && b.siswa) return a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa);
    return 0;
  });

  const summary: CompareSummary = {
    totalExcel: excelRows.length,
    totalSistem: dbStudents.length,
    cocok: results.filter((r) => r.status === 'COCOK').length,
    bedaData: results.filter((r) => r.status === 'BEDA_DATA').length,
    hanyaDiExcel: results.filter((r) => r.status === 'HANYA_DI_EXCEL').length,
    hanyaDiSistem: results.filter((r) => r.status === 'HANYA_DI_SISTEM').length,
    duplicateExcelNisn: findDuplicates(excelRows.map((r) => normalizeCode(r.nisn))),
    duplicateExcelNis: findDuplicates(excelRows.map((r) => normalizeCode(r.nis))),
    duplicateSistemNisn: findDuplicates(dbStudents.map((s) => normalizeCode(s.nisn))),
    duplicateSistemNis: findDuplicates(dbStudents.map((s) => normalizeCode(s.nis))),
  };

  return { results, summary };
}
