import { describe, it, expect } from 'vitest';
import { parseIndonesianDateRange, cleanGuruName, cleanMitraName, matchExcelRows } from '../excelPklParser';

describe('excelPklParser', () => {
  it('harus mem-parsing format durasi bahasa Indonesia dengan benar', () => {
    const res = parseIndonesianDateRange('29 JUNI - 16 OKTOBER 2026');
    expect(res.tanggal_mulai).toBe('2026-06-29');
    expect(res.tanggal_selesai).toBe('2026-10-16');
  });

  it('harus membersihkan gelar akademik guru untuk pencocokan fuzzy', () => {
    expect(cleanGuruName('CECEP ZAINAL ARIFIN, S.H.,S.Pd.Gr')).toBe('cecep zainal arifin');
    expect(cleanGuruName('IMAN ROHIMAN, S.Pd.')).toBe('iman rohiman');
  });

  it('harus membersihkan prefix nama mitra industri', () => {
    expect(cleanMitraName('PT. DIRGANTARA INDONESIA')).toBe('dirgantara indonesia');
    expect(cleanMitraName('BENGKEL 48 CUSTOM GARAGE')).toBe('48 custom garage');
  });

  it('harus mencocokkan siswa berdasarkan NISN persis', () => {
    const rawRows = [
      {
        NO: 1,
        NIS: '2425100283',
        'NISN ': '0083956947',
        'NAMA SISWA': 'RASYIID SIDIQ ELHANIF',
        KELAS: 'XI TKR 1',
        'TEMPAT PKL': '48 CUSTOM GARAGE',
        'DURASI PKL': '29 JUNI - 16 OKTOBER 2026',
        'PEMBIMBING SEKOLAH ': 'CECEP ZAINAL ARIFIN, S.H.,S.Pd.Gr',
        'NIP ': '19771116 202221 1 003'
      }
    ];

    const siswaList = [
      { id: 'siswa-1', nisn: '0083956947', nis: '2425100283', nama_siswa: 'RASYIID SIDIQ ELHANIF' }
    ];

    const mitraList = [
      { id: 'mitra-1', nama: '48 CUSTOM GARAGE' }
    ];

    const guruList = [
      { id: 'guru-1', nip: '197711162022211003', nama_guru: 'CECEP ZAINAL ARIFIN, S.Pd.' }
    ];

    const matched = matchExcelRows(rawRows, siswaList, mitraList, guruList);

    expect(matched.length).toBe(1);
    expect(matched[0].siswa_id).toBe('siswa-1');
    expect(matched[0].siswa_match_type).toBe('NISN_EXACT');
    expect(matched[0].mitra_id).toBe('mitra-1');
    expect(matched[0].mitra_match_type).toBe('EXACT');
    expect(matched[0].pembimbing_id).toBe('guru-1');
    expect(matched[0].pembimbing_match_type).toBe('NIP_EXACT');
    expect(matched[0].is_ready).toBe(true);
  });
});
