import { parsePastedExcelText, compareKelasWithExcel } from '../siswaExcelCompare';
import type { Siswa } from '../../types/academic';

const makeSiswa = (overrides: Partial<Siswa>): Siswa => ({
  id: 's-1',
  tenant_id: 't-1',
  nis: '24251001',
  nisn: '0081234567',
  nama_siswa: 'Ahmad Fauzan',
  jenis_kelamin: 'L',
  status: 'AKTIF',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('siswaExcelCompare', () => {
  it('parses 3-column Excel TSV without header using default NISN -> NIS -> NAMA order', () => {
    const raw = "'0081234567\t24251001\tAhmad  Fauzan\n0087654321\t24251002\tSiti Aisyah";
    const parsed = parsePastedExcelText(raw);

    expect(parsed.headerDetected).toBe(false);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      rowNumber: 1,
      nisn: '0081234567',
      nis: '24251001',
      nama: 'Ahmad Fauzan',
    });
  });

  it('auto-detects header order (NIS | NISN | Nama) and skips leading No column', () => {
    const raw = [
      'No\tNIS\tNISN\tNama Lengkap',
      '1\t24251001\t0081234567\tAhmad Fauzan',
      '2\t24251002\t0087654321\tSiti Aisyah',
    ].join('\n');

    const parsed = parsePastedExcelText(raw);
    expect(parsed.headerDetected).toBe(true);
    expect(parsed.detectedOrder).toBe('NIS_NISN_NAMA');
    expect(parsed.skippedNoColumn).toBe(true);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]).toMatchObject({
      nisn: '0087654321',
      nis: '24251002',
      nama: 'Siti Aisyah',
    });
  });

  it('categorizes COCOK, BEDA_DATA (including leading zero & name typo), HANYA_DI_EXCEL, and HANYA_DI_SISTEM', () => {
    const raw = [
      '0081234567\t24251001\tAHMAD FAUZAN',       // COCOK (case-insensitive)
      '0082222222\t24259999\tBudi Santoso',       // BEDA_DATA (NIS beda, match via NISN)
      '83333333\t24251003\tCitra Lestari',        // BEDA_DATA (NISN beda angka 0 depan)
      '0084444444\t24251004\tSiswa Baru Excel',   // HANYA_DI_EXCEL
    ].join('\n');

    const dbStudents: Siswa[] = [
      makeSiswa({ id: '1', nisn: '0081234567', nis: '24251001', nama_siswa: 'Ahmad Fauzan' }),
      makeSiswa({ id: '2', nisn: '0082222222', nis: '24251002', nama_siswa: 'Budi Santoso' }),
      makeSiswa({ id: '3', nisn: '0083333333', nis: '24251003', nama_siswa: 'Citra Lestari' }),
      makeSiswa({ id: '5', nisn: '0085555555', nis: '24251005', nama_siswa: 'Siswa Hanya Sistem' }),
    ];

    const parsed = parsePastedExcelText(raw);
    const out = compareKelasWithExcel(parsed.rows, dbStudents, { ignoreCaseNama: true });

    expect(out.summary).toMatchObject({
      totalExcel: 4,
      totalSistem: 4,
      cocok: 1,
      bedaData: 2,
      hanyaDiExcel: 1,
      hanyaDiSistem: 1,
    });

    const budi = out.results.find((r) => r.siswa?.id === '2');
    expect(budi?.status).toBe('BEDA_DATA');
    expect(budi?.diffs.nis).toBe(true);
    expect(budi?.diffs.nisn).toBe(false);

    const citra = out.results.find((r) => r.siswa?.id === '3');
    expect(citra?.status).toBe('BEDA_DATA');
    expect(citra?.diffs.nisn).toBe(true);
    expect(citra?.diffs.leadingZeroNisn).toBe(true);
  });

  it('flags duplicate NISN / NIS inside pasted Excel rows', () => {
    const raw = [
      '0081234567\t24251001\tSiswa A',
      '0081234567\t24251002\tSiswa B',
    ].join('\n');

    const parsed = parsePastedExcelText(raw);
    const out = compareKelasWithExcel(parsed.rows, []);

    expect(out.summary.duplicateExcelNisn).toEqual(['0081234567']);
    expect(out.summary.duplicateExcelNis).toEqual([]);
  });
});
