import axios from 'axios';
import { appLogger } from '@/utils/app-logger';

export interface SettingSheetMetadata {
  kelas: string;
  semester: string;
  tahunPelajaran: string;
  fase: string;
  konsentrasiKeahlian: string;
  programKeahlian: string;
  walas: string;
  nipWalas: string;
  namaSekolah: string;
  namaKepsek: string;
  nipKepsek: string;
  titimangsaGanjil: string;
  titimangsaGenap: string;
  ownId?: string;
  orchestratorId?: string;
}

export interface StudentSumatifScoreItem {
  sumatif_1: number | null;
  sumatif_2: number | null;
  sumatif_3: number | null;
  rata_rata: number | null;
  nilai_akhir: number | null;
}

export interface StudentSumatifRecord {
  no: number;
  nis: string;
  nisn: string;
  nama: string;
  kelas: string;
  semester: string;
  scores: Record<string, StudentSumatifScoreItem>;
}

export interface StudentCpGradeItem {
  nilai_rapor: number | null;
  capaian_kompetensi: string;
}

export interface StudentCpRecord {
  no: number;
  nis: string;
  nisn: string;
  nama: string;
  kelas: string;
  semester: string;
  mapelGrades: Record<string, StudentCpGradeItem>;
  kehadiran: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  catatanWali: string;
  keputusanTransisi: string;
  pkl: {
    tempat: string;
    alamat: string;
    nilai: number | null;
    nilaiUkk: number | null;
  };
  ekskul: Array<{
    nama: string;
    predikat: string;
    keterangan: string;
  }>;
}

export interface ParsedRaporClassData {
  sourceUrl: string;
  fileTitle?: string;
  metadata: SettingSheetMetadata;
  detectedSubjects: string[];
  totalSiswa: number;
  sumatifStudents: StudentSumatifRecord[];
  cpStudents: StudentCpRecord[];
}

export class GoogleSheetRaporParserService {
  /**
   * Helper Parser CSV handal yang mendukung quotes, newline dalam sel, dan koma.
   */
  static parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        rows.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }

    if (row.length > 1 || row[0] !== '') {
      rows.push(row);
    }

    return rows;
  }

  /**
   * Cek apakah URL yang diberikan merupakan tautan folder Google Drive
   */
  static isFolderUrl(url: string): boolean {
    const trimmed = url.trim();
    return trimmed.includes('/folders/') || trimmed.includes('/drive/folders/');
  }

  /**
   * Ekstraksi Folder ID dari tautan folder Google Drive
   */
  static extractFolderId(url: string): string {
    const trimmed = url.trim();
    const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{25,})/);
    if (match) return match[1];
    throw new Error('Format tautan folder Google Drive tidak valid.');
  }

  /**
   * Ekstraksi otomatis seluruh berkas Google Sheet dari tautan folder Google Drive publik.
   * Hanya menyaring berkas tipe Google Sheets (mengabaikan PDF, Google Dokumen, Foto, Folder, dll).
   */
  static async extractGoogleSheetUrlsFromFolder(
    folderUrl: string
  ): Promise<Array<{ id: string; url: string; title?: string }>> {
    const folderId = this.extractFolderId(folderUrl);
    const requestUrl = `https://drive.google.com/drive/folders/${folderId}`;

    appLogger.info({ folderId, folderUrl }, 'Memindai berkas Google Sheet di dalam folder Google Drive...');

    const res = await axios.get<string>(requestUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      maxRedirects: 5,
      timeout: 20000,
    });

    const html = res.data;

    // Cek jika akses dibatasi login
    if (typeof html === 'string' && (html.includes('ServiceLogin') || html.includes('accounts.google.com/signin'))) {
      throw new Error(
        'Folder Google Drive ini masih dibatasi (Privat). Silakan buka folder tersebut di Google Drive, klik menu "Bagikan", lalu ubah akses umum menjadi "Siapa saja yang memiliki link".'
      );
    }

    const rowRegex = /<tr[^>]*data-id="([a-zA-Z0-9_-]{25,})"[^>]*data-target="doc"[\s\S]*?<\/tr>/g;
    let m: RegExpExecArray | null;
    const foundSpreadsheets: Array<{ id: string; url: string; title?: string }> = [];
    const seenIds = new Set<string>();

    while ((m = rowRegex.exec(html)) !== null) {
      const rowHtml = m[0];
      const idMatch = rowHtml.match(/data-id="([a-zA-Z0-9_-]{25,})"/);
      const id = idMatch ? idMatch[1] : null;
      if (!id || seenIds.has(id)) continue;

      // Filter ketat: HANYA Google Sheets (bukan PDF, Google Doc, Gambar, Shortcut, dsb)
      const isGoogleSheet =
        rowHtml.includes('Google Sheets') ||
        rowHtml.includes('Spreadsheet') ||
        rowHtml.includes('application/vnd.google-apps.spreadsheet') ||
        rowHtml.includes('spreadsheets');

      const isPdf = rowHtml.includes('PDF') || rowHtml.includes('application/pdf') || /\.pdf/i.test(rowHtml);
      const isGoogleDoc = rowHtml.includes('Google Dokumen') || rowHtml.includes('Google Docs');

      if (isGoogleSheet && !isPdf && !isGoogleDoc) {
        seenIds.add(id);
        const textMatches = [...rowHtml.matchAll(/>([^<]{3,100})</g)]
          .map((x) => x[1].trim())
          .filter((x) => x && !x.startsWith('ssk=') && x !== 'Google Sheets' && x !== 'Dibagikan');

        foundSpreadsheets.push({
          id,
          url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
          title: textMatches[0] || undefined,
        });
      }
    }

    if (foundSpreadsheets.length === 0) {
      throw new Error(
        'Tidak ditemukan berkas Google Sheet di dalam folder Google Drive ini. Pastikan folder berisi berkas Google Sheet rapor kelas dan akses disetel "Siapa saja yang memiliki link".'
      );
    }

    appLogger.info(
      { folderId, totalSheets: foundSpreadsheets.length },
      'Berhasil menemukan berkas Google Sheet di dalam folder Google Drive'
    );
    return foundSpreadsheets;
  }

  /**
   * Ekstraksi Spreadsheet ID dari beragam format link Google Docs/Drive
   */
  static extractSpreadsheetId(url: string): string {
    const trimmed = url.trim();

    // Deteksi jika pengguna secara tidak sengaja memasukkan link Google Drive Folder
    if (this.isFolderUrl(trimmed)) {
      throw new Error(
        'Tautan yang dimasukkan adalah folder Google Drive. Sistem kini mendukung tautan folder secara otomatis melalui proses ekstraksi berkas kelas.'
      );
    }

    // Pola 1: /spreadsheets/d/ID atau /file/d/ID atau /d/ID
    const match = trimmed.match(/\/(?:spreadsheets|file)\/d\/([a-zA-Z0-9_-]{25,})/) || trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (match) {
      return match[1];
    }

    // Pola 2: Jika pengguna langsung menempel Spreadsheet ID murni
    if (/^[a-zA-Z0-9_-]{25,80}$/.test(trimmed)) {
      return trimmed;
    }

    throw new Error('Format tautan Google Sheet tidak valid. Pastikan menyertakan tautan Google Sheet kelas (https://docs.google.com/spreadsheets/d/.../edit).');
  }

  /**
   * Mengambil daftar tab dan GID-nya dari tampilan htmlview publik Google Sheet
   */
  static async fetchSheetTabs(spreadsheetId: string): Promise<Array<{ name: string; gid: string }>> {
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
    try {
      const res = await axios.get<string>(htmlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        maxRedirects: 5,
        timeout: 15000,
      });

      const html = res.data;

      // Cek jika dialihkan ke halaman login akun Google (Restricted access)
      if (typeof html === 'string' && (html.includes('ServiceLogin') || html.includes('accounts.google.com/signin'))) {
        throw new Error(
          'Akses berkas Google Sheet ini masih dibatasi (Privat). Silakan buka file tersebut di Google Drive, klik menu "Bagikan / Share", lalu ubah akses umum menjadi "Siapa saja yang memiliki link" (Anyone with the link can view).'
        );
      }

      const re = /items\.push\(\{name:\s*"([^"]+)",\s*pageUrl:[^}]*gid:\s*"([0-9]+)"/g;
      let m: RegExpExecArray | null;
      const tabs: Array<{ name: string; gid: string }> = [];

      while ((m = re.exec(html)) !== null) {
        tabs.push({ name: m[1].trim(), gid: m[2] });
      }

      if (tabs.length === 0) {
        // Fallback: cari tautan gid di anchor tag atau tab list htmlview
        const re2 = /gid=([0-9]+)[^>]*>([^<]+)<\/a>/g;
        while ((m = re2.exec(html)) !== null) {
          tabs.push({ name: m[2].trim(), gid: m[1] });
        }
      }

      if (tabs.length === 0) {
        throw new Error(
          'Tidak dapat membaca daftar sheet/tab di berkas Google Sheet ini. Pastikan akses Google Sheet disetel ke "Siapa saja yang memiliki link dapat melihat".'
        );
      }

      return tabs;
    } catch (err: any) {
      appLogger.error({ err }, `Gagal memuat htmlview Google Sheet ${spreadsheetId}`);
      if (err.message && err.message.includes('Akses berkas Google Sheet ini masih dibatasi')) {
        throw err;
      }
      throw new Error(`Gagal membuka dokumen Google Sheet: ${err.message || 'Periksa apakah akses disetel publik (Anyone with the link can view)'}`);
    }
  }

  /**
   * Mengunduh konten CSV dari tab/sheet tertentu via endpoint ekspor Google Docs
   */
  static async fetchSheetCsv(spreadsheetId: string, gid: string): Promise<string> {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    try {
      const res = await axios.get<string>(csvUrl, {
        responseType: 'text',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      return res.data;
    } catch (err: any) {
      appLogger.error({ err }, `Gagal mengunduh CSV gid=${gid} dari spreadsheet=${spreadsheetId}`);
      throw new Error(`Gagal membaca sheet (GID: ${gid}): ${err.message}`);
    }
  }

  /**
   * ── 1. Dynamic Variable/Label Scanner untuk Sheet SETTING ──
   * Memindai baris demi baris mencari label variabel kunci tanpa bergantung pada koordinat statis C2, C3, dll.
   */
  static parseSettingSheet(rows: string[][]): SettingSheetMetadata {
    const meta: SettingSheetMetadata = {
      kelas: '',
      semester: '',
      tahunPelajaran: '',
      fase: '',
      konsentrasiKeahlian: '',
      programKeahlian: '',
      walas: '',
      nipWalas: '',
      namaSekolah: '',
      namaKepsek: '',
      nipKepsek: '',
      titimangsaGanjil: '',
      titimangsaGenap: '',
      ownId: '',
      orchestratorId: '',
    };

    const labelPatterns = [
      { key: 'kelas' as const, regex: /^kelas$/i },
      { key: 'semester' as const, regex: /^(pilih\s*)?semester$/i },
      { key: 'tahunPelajaran' as const, regex: /^tahun\s*pelajaran$/i },
      { key: 'fase' as const, regex: /^fase$/i },
      { key: 'konsentrasiKeahlian' as const, regex: /^konsentrasi\s*keahlian$/i },
      { key: 'programKeahlian' as const, regex: /^program\s*keahlian$/i },
      { key: 'walas' as const, regex: /^(walas|wali\s*kelas)$/i },
      { key: 'nipWalas' as const, regex: /^nip\s*(walas|wali\s*kelas)$/i },
      { key: 'namaSekolah' as const, regex: /^nama\s*sekolah$/i },
      { key: 'namaKepsek' as const, regex: /^nama\s*kepsek$/i },
      { key: 'nipKepsek' as const, regex: /^nip\s*kepsek$/i },
      { key: 'titimangsaGanjil' as const, regex: /^tgl\.?\s*titimangsa\s*ganjil$/i },
      { key: 'titimangsaGenap' as const, regex: /^tgl\.?\s*titimangsa\s*genap$/i },
      { key: 'ownId' as const, regex: /^(own_id|file\s*id\s*file)$/i },
      { key: 'orchestratorId' as const, regex: /^file\s*id\s*orkestrator$/i },
    ];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < Math.min(row.length, 6); c++) {
        const cellText = (row[c] || '').trim();
        if (!cellText) continue;

        for (const pattern of labelPatterns) {
          if (!meta[pattern.key] && pattern.regex.test(cellText)) {
            // Label cocok! Cari nilai di kolom-kolom berikutnya pada baris yang sama
            for (let valCol = c + 1; valCol < Math.min(row.length, c + 6); valCol++) {
              const val = (row[valCol] || '').trim();
              if (val && val !== ':') {
                meta[pattern.key] = val;
                break;
              }
            }
          }
        }
      }
    }

    return meta;
  }

  /**
   * ── 2. Dynamic Parser untuk Sheet INPUT SUMATIF ──
   * Mendeteksi header kolom secara dinamis dan mengelompokkan nilai sumatif per mata pelajaran.
   */
  static parseSumatifSheet(rows: string[][]): { detectedSubjects: string[]; students: StudentSumatifRecord[] } {
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const rowStr = rows[r].join('|').toLowerCase();
      if (rowStr.includes('sumatif 1') && rowStr.includes('sumatif 2')) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Baris header tidak ditemukan pada sheet INPUT SUMATIF');
    }

    const headerRow = rows[headerRowIdx];
    const colIndex = {
      no: headerRow.findIndex((c) => /^no$/i.test(c.trim())),
      nis: headerRow.findIndex((c) => /^nis$/i.test(c.trim())),
      nisn: headerRow.findIndex((c) => /^nisn$/i.test(c.trim())),
      nama: headerRow.findIndex((c) => /^nama$/i.test(c.trim())),
      kelas: headerRow.findIndex((c) => /^kelas$/i.test(c.trim())),
      semester: headerRow.findIndex((c) => /^semester$/i.test(c.trim())),
    };

    const subjectColumns: Record<string, { [key: string]: number }> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const title = (headerRow[c] || '').trim();
      const sumMatch = title.match(/^(.*?)\s+SUMATIF\s+(\d+)$/i);
      const avgMatch = title.match(/^(.*?)\s+RATA-RATA\s+SUMATIF$/i);
      const finalMatch = title.match(/^(.*?)\s+NILAI\s+SUMATIF\s+AKHIR$/i);

      if (sumMatch) {
        const subjectName = sumMatch[1].trim();
        const num = parseInt(sumMatch[2], 10);
        if (!subjectColumns[subjectName]) subjectColumns[subjectName] = {};
        subjectColumns[subjectName][`sumatif_${num}`] = c;
      } else if (avgMatch) {
        const subjectName = avgMatch[1].trim();
        if (!subjectColumns[subjectName]) subjectColumns[subjectName] = {};
        subjectColumns[subjectName]['rata_rata'] = c;
      } else if (finalMatch) {
        const subjectName = finalMatch[1].trim();
        if (!subjectColumns[subjectName]) subjectColumns[subjectName] = {};
        subjectColumns[subjectName]['nilai_akhir'] = c;
      }
    }

    const students: StudentSumatifRecord[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const nama = (row[colIndex.nama] || '').trim();
      const nis = (row[colIndex.nis] || '').trim();
      // Lewati baris kosong, header ganda, atau baris ringkasan
      if (!nama || /^nama$/i.test(nama) || /^nis$/i.test(nis) || /^(tdkada|kosong|-|jumlah|rata-rata)$/i.test(nama)) {
        continue;
      }

      const studentScores: Record<string, StudentSumatifScoreItem> = {};
      for (const [subjectName, cols] of Object.entries(subjectColumns)) {
        const s1 = parseFloat(row[cols.sumatif_1]);
        const s2 = parseFloat(row[cols.sumatif_2]);
        const s3 = parseFloat(row[cols.sumatif_3]);
        const avg = parseFloat(row[cols.rata_rata]);
        const akhir = parseFloat(row[cols.nilai_akhir]);

        studentScores[subjectName] = {
          sumatif_1: !isNaN(s1) ? s1 : null,
          sumatif_2: !isNaN(s2) ? s2 : null,
          sumatif_3: !isNaN(s3) ? s3 : null,
          rata_rata: !isNaN(avg) ? avg : null,
          nilai_akhir: !isNaN(akhir) ? akhir : null,
        };
      }

      students.push({
        no: parseInt(row[colIndex.no], 10) || students.length + 1,
        nis,
        nisn: (row[colIndex.nisn] || '').trim(),
        nama,
        kelas: (row[colIndex.kelas] || '').trim(),
        semester: (row[colIndex.semester] || '').trim(),
        scores: studentScores,
      });
    }

    return {
      detectedSubjects: Object.keys(subjectColumns),
      students,
    };
  }

  /**
   * ── 3. Dynamic Parser untuk Sheet INPUT CP ──
   * Mengekstrak nilai rapor akhir, teks narasi capaian kompetensi, presensi, ekskul, dan catatan wali kelas.
   */
  static parseCPSheet(rows: string[][]): { detectedSubjects: string[]; students: StudentCpRecord[] } {
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const rowStr = rows[r].join('|').toLowerCase();
      if (rowStr.includes('cp pai') || rowStr.includes('cp b. indonesia') || rowStr.includes('cp pkn')) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Baris header tidak ditemukan pada sheet INPUT CP');
    }

    const headerRow = rows[headerRowIdx];
    const colIndex = {
      no: headerRow.findIndex((c) => /^no$/i.test(c.trim())),
      nis: headerRow.findIndex((c) => /^nis$/i.test(c.trim())),
      nisn: headerRow.findIndex((c) => /^nisn$/i.test(c.trim())),
      nama: headerRow.findIndex((c) => /^nama$/i.test(c.trim())),
      kelas: headerRow.findIndex((c) => /^kelas$/i.test(c.trim())),
      semester: headerRow.findIndex((c) => /^semester$/i.test(c.trim())),
      sakit: headerRow.findIndex((c) => /^sakit$/i.test(c.trim())),
      izin: headerRow.findIndex((c) => /^izin$/i.test(c.trim())),
      alpa: headerRow.findIndex((c) => /^(alpa|tanpa\s*keterangan)$/i.test(c.trim())),
      catatanWali: headerRow.findIndex((c) => /^catatan\s*wali(\s*kelas)?$/i.test(c.trim())),
      keputusan: headerRow.findIndex((c) => /^(naik\s*or\s*tinggal|keputusan(\s*transisi)?)$/i.test(c.trim())),
      tempatPkl: headerRow.findIndex((c) => /^tempat\s*pkl$/i.test(c.trim())),
      alamatPkl: headerRow.findIndex((c) => /^alamat\s*pkl$/i.test(c.trim())),
      nilaiPkl: headerRow.findIndex((c) => /^nilai\s*pkl$/i.test(c.trim())),
      nilaiUkk: headerRow.findIndex((c) => /^nilai\s*ukk$/i.test(c.trim())),
      ekskul1: headerRow.findIndex((c) => /^ekskul-?1$/i.test(c.trim())),
      ekskul2: headerRow.findIndex((c) => /^ekskul-?2$/i.test(c.trim())),
      predikat1: headerRow.findIndex((c) => /^predikat-?1$/i.test(c.trim())),
      predikat2: headerRow.findIndex((c) => /^predikat-?2$/i.test(c.trim())),
      ket1: headerRow.findIndex((c) => /^ket-?1$/i.test(c.trim())),
      ket2: headerRow.findIndex((c) => /^ket-?2$/i.test(c.trim())),
    };

    const cpMapelCols: Record<string, { cpCol: number; gradeCol: number }> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const title = (headerRow[c] || '').trim();
      const cpMatch = title.match(/^CP\s+(.*)$/i);
      if (cpMatch) {
        const subjectName = cpMatch[1].trim();
        const cpCol = c;
        const gradeCol = c > 0 ? c - 1 : -1;
        cpMapelCols[subjectName] = { cpCol, gradeCol };
      }
    }

    const students: StudentCpRecord[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const nama = (row[colIndex.nama] || '').trim();
      const nis = (row[colIndex.nis] || '').trim();
      if (!nama || /^nama$/i.test(nama) || /^nis$/i.test(nis) || /^(tdkada|kosong|-|jumlah|rata-rata)$/i.test(nama)) {
        continue;
      }

      const mapelGrades: Record<string, StudentCpGradeItem> = {};
      for (const [subjectName, cols] of Object.entries(cpMapelCols)) {
        const rawGrade = cols.gradeCol !== -1 ? parseFloat(row[cols.gradeCol]) : null;
        const cpText = cols.cpCol !== -1 ? (row[cols.cpCol] || '').trim() : '';
        mapelGrades[subjectName] = {
          nilai_rapor: !isNaN(rawGrade as number) ? rawGrade : null,
          capaian_kompetensi: cpText,
        };
      }

      students.push({
        no: parseInt(row[colIndex.no], 10) || students.length + 1,
        nis,
        nisn: (row[colIndex.nisn] || '').trim(),
        nama,
        kelas: (row[colIndex.kelas] || '').trim(),
        semester: (row[colIndex.semester] || '').trim(),
        mapelGrades,
        kehadiran: {
          sakit: parseInt(row[colIndex.sakit], 10) || 0,
          izin: parseInt(row[colIndex.izin], 10) || 0,
          alpa: parseInt(row[colIndex.alpa], 10) || 0,
        },
        catatanWali: colIndex.catatanWali !== -1 ? (row[colIndex.catatanWali] || '').trim() : '',
        keputusanTransisi: colIndex.keputusan !== -1 ? (row[colIndex.keputusan] || '').trim() : '',
        pkl: {
          tempat: colIndex.tempatPkl !== -1 ? (row[colIndex.tempatPkl] || '').trim() : '',
          alamat: colIndex.alamatPkl !== -1 ? (row[colIndex.alamatPkl] || '').trim() : '',
          nilai: colIndex.nilaiPkl !== -1 && !isNaN(parseFloat(row[colIndex.nilaiPkl])) ? parseFloat(row[colIndex.nilaiPkl]) : null,
          nilaiUkk: colIndex.nilaiUkk !== -1 && !isNaN(parseFloat(row[colIndex.nilaiUkk])) ? parseFloat(row[colIndex.nilaiUkk]) : null,
        },
        ekskul: [
          {
            nama: colIndex.ekskul1 !== -1 ? (row[colIndex.ekskul1] || '').trim() : '',
            predikat: colIndex.predikat1 !== -1 ? (row[colIndex.predikat1] || '').trim() : '',
            keterangan: colIndex.ket1 !== -1 ? (row[colIndex.ket1] || '').trim() : '',
          },
          {
            nama: colIndex.ekskul2 !== -1 ? (row[colIndex.ekskul2] || '').trim() : '',
            predikat: colIndex.predikat2 !== -1 ? (row[colIndex.predikat2] || '').trim() : '',
            keterangan: colIndex.ket2 !== -1 ? (row[colIndex.ket2] || '').trim() : '',
          },
        ].filter((e) => e.nama),
      });
    }

    return {
      detectedSubjects: Object.keys(cpMapelCols),
      students,
    };
  }

  /**
   * ── Public Method: Parse Google Sheet URL Lengkap ──
   * Menerima URL Google Sheet, membedah tab SETTING, INPUT SUMATIF, dan INPUT CP, lalu mengembalikan data terpadu.
   */
  static async parseGoogleSheet(url: string): Promise<ParsedRaporClassData> {
    const spreadsheetId = this.extractSpreadsheetId(url);
    const tabs = await this.fetchSheetTabs(spreadsheetId);

    if (tabs.length === 0) {
      throw new Error('Tidak dapat menemukan lembar kerja (tab) pada Google Sheet ini. Pastikan dokumen dapat diakses.');
    }

    // Cari tab SETTING, INPUT SUMATIF, dan INPUT CP secara dinamis
    const settingTab = tabs.find((t) => /^setting$/i.test(t.name) || /setting/i.test(t.name));
    const sumatifTab = tabs.find((t) => /^input\s*sumatif$/i.test(t.name) || /sumatif/i.test(t.name));
    const cpTab = tabs.find((t) => /^input\s*cp$/i.test(t.name) || /input.*cp/i.test(t.name));

    if (!settingTab) {
      throw new Error("Sheet 'SETTING' tidak ditemukan dalam dokumen Google Sheet.");
    }
    if (!sumatifTab) {
      throw new Error("Sheet 'INPUT SUMATIF' tidak ditemukan dalam dokumen Google Sheet.");
    }
    if (!cpTab) {
      throw new Error("Sheet 'INPUT CP' tidak ditemukan dalam dokumen Google Sheet.");
    }

    // Ambil isi CSV ketiga sheet secara paralel
    const [settingCsv, sumatifCsv, cpCsv] = await Promise.all([
      this.fetchSheetCsv(spreadsheetId, settingTab.gid),
      this.fetchSheetCsv(spreadsheetId, sumatifTab.gid),
      this.fetchSheetCsv(spreadsheetId, cpTab.gid),
    ]);

    const settingRows = this.parseCSV(settingCsv);
    const sumatifRows = this.parseCSV(sumatifCsv);
    const cpRows = this.parseCSV(cpCsv);

    const metadata = this.parseSettingSheet(settingRows);
    const sumatifData = this.parseSumatifSheet(sumatifRows);
    const cpData = this.parseCPSheet(cpRows);

    // Gabungkan daftar mata pelajaran unik yang terdeteksi
    const subjectSet = new Set<string>([...sumatifData.detectedSubjects, ...cpData.detectedSubjects]);

    // Cross-check total siswa
    const totalSiswa = Math.max(sumatifData.students.length, cpData.students.length);

    return {
      sourceUrl: url,
      metadata,
      detectedSubjects: Array.from(subjectSet),
      totalSiswa,
      sumatifStudents: sumatifData.students,
      cpStudents: cpData.students,
    };
  }
}
