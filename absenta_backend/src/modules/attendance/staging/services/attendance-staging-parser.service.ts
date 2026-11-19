import * as xlsx from 'xlsx';
import axios from 'axios';
import { appLogger } from '@/utils/app-logger';

export interface ParsedAttendanceSession {
  colIndex: number;
  dateStr: string; // "12-10-2026"
  dateIso: string; // "2026-10-12"
  day: string; // "SENIN", "SELASA", etc.
  sessionCode: string; // "UP", "AP", "AS"
  defaultType: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE';
}

export interface ParsedAttendanceStudent {
  no: number;
  nis: string;
  nisn: string;
  nama: string;
  attendance: Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI'>; // key: `${dateIso}_${sessionCode}`
}

export interface ParsedAttendanceSheetData {
  sheetName: string;
  namaKelas: string;
  programKeahlian?: string;
  tahunPelajaran?: string;
  rentangTanggal?: string;
  sessionCount: number;
  sessions: ParsedAttendanceSession[];
  studentCount: number;
  students: ParsedAttendanceStudent[];
}

export class AttendanceStagingParserService {
  /**
   * Ekstrak Spreadsheet ID dari format URL Google Sheet / Google Drive
   */
  static extractSpreadsheetId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Unduh file Google Spreadsheet sebagai XLSX buffer
   */
  static async fetchSpreadsheetBuffer(url: string): Promise<{ buffer: Buffer; spreadsheetId: string }> {
    const spreadsheetId = this.extractSpreadsheetId(url);
    if (!spreadsheetId) {
      throw new Error('URL Google Sheet tidak valid. Pastikan tautan memiliki format /spreadsheets/d/{SPREADSHEET_ID}');
    }

    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    appLogger.info({ spreadsheetId, exportUrl }, 'Mengunduh Google Spreadsheet untuk Staging Absensi');

    try {
      const response = await axios.get(exportUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AbsentaStaging/1.0',
        },
      });

      return {
        buffer: Buffer.from(response.data),
        spreadsheetId,
      };
    } catch (err: any) {
      appLogger.error({ err: err.message, spreadsheetId }, 'Gagal mengunduh Google Spreadsheet');
      throw new Error(`Gagal mengunduh Google Sheet: ${err.message}. Pastikan izin share disetel ke "Siapa saja yang memiliki link (Viewer)".`);
    }
  }

  /**
   * Konversi format tanggal DD-MM-YYYY ke YYYY-MM-DD
   */
  static convertDateToIso(rawDate: string): string {
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    return rawDate;
  }

  /**
   * Normalisasi nama hari
   */
  static normalizeDay(rawDay: string): string {
    const upper = (rawDay || '').toUpperCase().trim();
    if (upper.startsWith('SEN')) return 'SENIN';
    if (upper.startsWith('SEL')) return 'SELASA';
    if (upper.startsWith('RAB')) return 'RABU';
    if (upper.startsWith('KAM')) return 'KAMIS';
    if (upper.startsWith('JUM')) return 'JUMAT';
    if (upper.startsWith('SAB')) return 'SABTU';
    if (upper.startsWith('MIN') || upper.startsWith('AHA')) return 'MINGGU';
    return upper;
  }

  /**
   * Parse seluruh lembar (multi-sheet) dari XLSX buffer
   */
  static parseWorkbook(buffer: Buffer): ParsedAttendanceSheetData[] {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const results: ParsedAttendanceSheetData[] = [];

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (!rows || rows.length < 16) continue;

      let tahunPelajaran: string | undefined = undefined;
      let namaKelas: string | undefined = undefined;
      let programKeahlian: string | undefined = undefined;

      // Scan 14 baris awal untuk metadata
      for (let r = 0; r < 14; r++) {
        const row = rows[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (val.toUpperCase().includes('TAHUN PELAJARAN')) {
            const match = val.match(/(\d{4}\/\d{4})/);
            if (match) tahunPelajaran = match[1];
          }
          if (val.toUpperCase().startsWith('TINGKAT/KONSENTRASI KEAHLIAN')) {
            const nextVal = String(row[c + 3] || row[c + 2] || row[c + 1] || '');
            const clean = nextVal.replace(/^[:\s]+/, '').trim();
            if (clean) namaKelas = clean;
          }
          if (val.toUpperCase().startsWith('PROGRAM KEAHLIAN')) {
            const nextVal = String(row[c + 3] || row[c + 2] || row[c + 1] || '');
            const clean = nextVal.replace(/^[:\s]+/, '').trim();
            if (clean) programKeahlian = clean;
          }
        }
      }

      // Fallback nama kelas jika baris metadata kosong
      if (!namaKelas) {
        namaKelas = sheetName;
      }

      // Tanggal & Sesi dari Baris 12 (index 11), Baris 14 (index 13), Baris 15 (index 14)
      const dateRow = rows[11] || [];
      const dayRow = rows[13] || [];
      const sessionRow = rows[14] || [];

      const sessions: ParsedAttendanceSession[] = [];
      let currentDateStr: string | null = null;
      let currentDay: string | null = null;
      const collectedDates: string[] = [];

      for (let col = 4; col <= 15; col++) {
        const rawDate = dateRow[col];
        if (rawDate) {
          currentDateStr = String(rawDate).trim();
          if (!collectedDates.includes(currentDateStr)) {
            collectedDates.push(currentDateStr);
          }
        }
        const rawDay = dayRow[col];
        if (rawDay) {
          currentDay = this.normalizeDay(String(rawDay));
        }

        const sessionCode = String(sessionRow[col] || '').trim().toUpperCase();
        if (sessionCode && currentDateStr && currentDay) {
          const dateIso = this.convertDateToIso(currentDateStr);
          let defaultType: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE' = 'KETARUNAAN';

          if (sessionCode === 'UP' || currentDay === 'SENIN') {
            defaultType = sessionCode === 'AS' ? 'APEL_SORE' : 'UPACARA';
          } else if (sessionCode === 'AS') {
            defaultType = 'APEL_SORE';
          } else if (currentDay === 'JUMAT') {
            defaultType = 'DUHA';
          } else {
            defaultType = 'KETARUNAAN';
          }

          sessions.push({
            colIndex: col,
            dateStr: currentDateStr,
            dateIso,
            day: currentDay,
            sessionCode,
            defaultType,
          });
        }
      }

      const rentangTanggal = collectedDates.length > 0
        ? `${collectedDates[0]} s/d ${collectedDates[collectedDates.length - 1]}`
        : undefined;

      // Baca Siswa mulai Baris 16 (index 15)
      const students: ParsedAttendanceStudent[] = [];
      for (let r = 15; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;

        // 1. Cek baris footer/keterangan/tanda tangan pembina - STOP loop siswa
        const rowJoined = row.map((c: any) => String(c || '')).join(' ').toUpperCase();
        if (
          rowJoined.includes('PARAF PEMBINA') ||
          rowJoined.includes('PARAF PELATIH') ||
          rowJoined.includes('KETERANGAN :') ||
          rowJoined.includes('KETERANGAN:') ||
          rowJoined.includes('MENGETAHUI') ||
          rowJoined.includes('JUMLAH') ||
          rowJoined.includes('TOTAL') ||
          rowJoined.includes('REKAP') ||
          rowJoined.includes('WALI KELAS') ||
          rowJoined.includes('KEPALA SEKOLAH') ||
          rowJoined.includes('NIP.') ||
          rowJoined.includes('NIP ')
        ) {
          break; // Daftar siswa telah selesai, hentikan pembacaan baris bawah
        }

        const nama = String(row[3] || '').trim();
        if (!nama) continue;

        // 2. Proteksi jika baris legenda keterangan (I = IZIN, D = DISPENSASI, dll) terbaca
        const upperNama = nama.toUpperCase();
        if (
          upperNama.includes('=') ||
          /^[A-Z]\s*=\s*/i.test(nama) ||
          upperNama.startsWith('I =') ||
          upperNama.startsWith('D =') ||
          upperNama.startsWith('A =') ||
          upperNama.startsWith('S =') ||
          upperNama.startsWith('H =') ||
          upperNama.startsWith('UP =') ||
          upperNama.startsWith('AP =') ||
          upperNama.startsWith('AS =')
        ) {
          break; // Begitu menyentuh legenda keterangan, daftar siswa pasti sudah selesai
        }

        const no = Number(row[0]) || students.length + 1;
        const nis = String(row[1] || '').trim();
        const nisn = String(row[2] || '').trim();

        const attendance: Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI'> = {};
        for (const sess of sessions) {
          const rawStatus = String(row[sess.colIndex] || '').trim().toUpperCase();
          let status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI' = 'HADIR';
          if (rawStatus === 'S') status = 'SAKIT';
          else if (rawStatus === 'I') status = 'IZIN';
          else if (rawStatus === 'A') status = 'ALPA';
          else if (rawStatus === 'D') status = 'DISPENSASI';
          else if (rawStatus === 'H') status = 'HADIR';

          attendance[`${sess.dateIso}_${sess.sessionCode}`] = status;
        }

        students.push({
          no,
          nis,
          nisn,
          nama,
          attendance,
        });
      }

      results.push({
        sheetName,
        namaKelas,
        programKeahlian,
        tahunPelajaran,
        rentangTanggal,
        sessionCount: sessions.length,
        sessions,
        studentCount: students.length,
        students,
      });
    }

    return results;
  }
}
