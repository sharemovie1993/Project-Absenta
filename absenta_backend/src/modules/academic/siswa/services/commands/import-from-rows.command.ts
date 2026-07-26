import { prisma } from '@/utils/prisma';
import { findBestMatch } from '@/utils/normalization';
import { createSiswaCommand } from './create-siswa.command';

function getRowValue(row: Record<string, any>, ...possibleKeys: string[]): any {
  if (!row) return undefined;
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return row[k];
    }
  }
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const normTarget = pKey.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const matchedKey = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]+/g, '') === normTarget);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
      return row[matchedKey];
    }
  }
  return undefined;
}

const ID_MONTH_MAP: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1, febuari: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, agu: 7, ags: 7, agt: 7, aug: 7, august: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, oct: 9, october: 9,
  november: 10, nov: 10,
  desember: 11, des: 11, dec: 11, december: 11
};

function parseExcelDate(val: any): Date | undefined {
  if (val === null || val === undefined) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  // 1. Handle Excel Serial Number (e.g. 45127 = 2023-07-20)
  if (typeof val === 'number') {
    if (val > 1000 && val < 100000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date;
    }
    return undefined;
  }

  const str = String(val).trim();
  if (!str || str === '-' || str === 'KOSONG' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return undefined;
  }

  // Clean string: replace commas, tabs, extra spaces
  const cleanedStr = str.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // 2. Pattern: Text Month, e.g. "20 Juli 2023", "20 Jul 2023", "20-Juli-2023", "20/Jul/2023"
  const textMonthRegex = /^(\d{1,2})[\s\/\.-]+([a-zA-Z]{3,10})[\s\/\.-]+(\d{4})$/;
  const textMatch = cleanedStr.match(textMonthRegex);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthKey = textMatch[2].toLowerCase();
    const year = parseInt(textMatch[3], 10);
    const monthIndex = ID_MONTH_MAP[monthKey];

    if (monthIndex !== undefined && day >= 1 && day <= 31 && year > 1900) {
      const d = new Date(Date.UTC(year, monthIndex, day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Pattern: Numeric parts split by / . - or space
  const parts = cleanedStr.split(/[\/\.-]/).map(p => p.trim());
  if (parts.length === 3) {
    let y = 0, m = 0, d = 0;

    if (parts[0].length === 4) {
      // Format: YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else if (parts[2].length === 4) {
      // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Standard Indonesian Format)
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    } else if (parts[2].length === 2) {
      // Format: DD/MM/YY (e.g. 20/07/23)
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      const shortYear = parseInt(parts[2], 10);
      y = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
    }

    if (y > 1900 && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const parsedDate = new Date(Date.UTC(y, m, d));
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
  }

  // 4. Standard Date fallback (handles ISO 8601 like 2023-07-20T00:00:00Z)
  const directParsed = new Date(str);
  if (!isNaN(directParsed.getTime())) return directParsed;

  return undefined;
}

export async function importFromRowsCommand(rows: any[], tenantId: string, options: any): Promise<any> {
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  // 1. Pre-fetch reference data for Smart Match
  const [kelasAll, tahunPelajaranAll, semesterAll, jurusans, sekolah] = await Promise.all([
    prisma.kelas.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        nama_kelas: true,
        jurusan_id: true,
        Jurusan: { select: { nama: true } }
      }
    }),
    prisma.tahunPelajaran.findMany({ where: { tenant_id: tenantId }, select: { id: true, tahun: true } }),
    prisma.semester.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama_semester: true } }),
    prisma.jurusan.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama: true } }),
    prisma.sekolah.findFirst({ where: { tenant_id: tenantId } })
  ]);

  const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '');
  const tahunNames = tahunPelajaranAll.map(t => t.tahun);
  const semesterNames = semesterAll.map(s => s.nama_semester);
  const jurusanNames = jurusans.map(j => j.nama);

  // 2. Process rows
  for (const [index, row] of rows.entries()) {
    const rowNumber = row.__rowNum || (index + 2);
    try {
      const scenario = String(options?.scenario || options?.type || '').toUpperCase();
      const defaultStatus = scenario === 'HISTORIS' 
        ? 'LULUS' 
        : scenario === 'PPDB' 
          ? 'CALON' 
          : String(options?.status || 'AKTIF').trim().toUpperCase();

      const statusInput = String(row.status || row.Status || defaultStatus).trim().toUpperCase();
      const isCalon = statusInput === 'CALON' || scenario === 'PPDB';
      const isHistoris = ['LULUS', 'MUTASI', 'TIDAK_AKTIF'].includes(statusInput) || scenario === 'HISTORIS';

      const inputJurusan = row.JURUSAN || row.jurusan || row.Jurusan || row.nama_jurusan;
      if (isSmkMak && isCalon && !inputJurusan) {
        throw new Error('Kolom JURUSAN wajib diisi untuk siswa CALON (PPDB) di sekolah SMK/MAK');
      }

      // Resolve Jurusan if provided
      let matchedJurusanId: string | undefined = undefined;
      if (inputJurusan) {
        const matchJurusan = findBestMatch(String(inputJurusan), jurusanNames);
        if (matchJurusan.match) {
          matchedJurusanId = jurusans.find(j => j.nama === matchJurusan.match)?.id;
        } else if (isSmkMak && isCalon) {
          throw new Error(`Jurusan "${inputJurusan}" tidak ditemukan`);
        }
      }

      // Resolve Kelas if NOT CALON and NOT HISTORIS
      let kelasId: string | undefined = undefined;
      if (!isCalon && !isHistoris) {
        const inputKelas = row.kelas || row.nama_kelas || row.Kelas;
        if (!inputKelas) throw new Error('Kolom Kelas wajib diisi untuk siswa aktif');

        // Filter kandidat kelas berdasarkan jurusan (jika diisi)
        let candidateKelas = kelasAll;
        if (inputJurusan) {
          const matchJurusan = findBestMatch(String(inputJurusan), jurusanNames);
          if (matchJurusan.match) {
            const targetJurusanId = jurusans.find(j => j.nama === matchJurusan.match)?.id;
            candidateKelas = kelasAll.filter(k => k.jurusan_id === targetJurusanId);
          }
        }

        const candidateNames = candidateKelas.map(k => k.nama_kelas);
        const matchKelas = findBestMatch(String(inputKelas), candidateNames);
        if (!matchKelas.match) throw new Error(`Kelas "${inputKelas}" tidak ditemukan`);

        // Deteksi ambiguitas
        const matchedKelasAll = candidateKelas.filter(k => k.nama_kelas === matchKelas.match);
        if (matchedKelasAll.length > 1) {
          const list = matchedKelasAll.map(k => k.Jurusan?.nama || 'tanpa jurusan').join(', ');
          throw new Error(
            `Kelas "${matchKelas.match}" ambigu — ditemukan di beberapa jurusan: ${list}. ` +
            `Sertakan kolom JURUSAN di Excel untuk menentukan kelas yang tepat.`
          );
        }
        kelasId = matchedKelasAll[0].id;
      } else if (isHistoris) {
        const inputKelas = row.kelas || row.nama_kelas || row.Kelas;
        if (inputKelas) {
          const matchKelas = findBestMatch(String(inputKelas), kelasAll.map(k => k.nama_kelas));
          if (matchKelas.match) {
            const kObj = kelasAll.find(k => k.nama_kelas === matchKelas.match);
            if (kObj) kelasId = kObj.id;
          }
        }
      }

      // Smart Match Tahun Pelajaran (Optional - fallback to active if provided in options or leave null)
      let tahunPelajaranId = options?.tahun_pelajaran_id;
      const inputTahun = row.tahun_pelajaran || row.tahun || row.Tahun;
      if (inputTahun) {
        const matchTahun = findBestMatch(String(inputTahun), tahunNames);
        if (matchTahun.match) {
          tahunPelajaranId = tahunPelajaranAll.find(t => t.tahun === matchTahun.match)?.id;
        }
      }

      // Smart Match Semester (Optional)
      let semesterId = options?.semester_id;
      const inputSemester = row.semester || row.Semester || row.nama_semester;
      if (inputSemester) {
        const matchSemester = findBestMatch(String(inputSemester), semesterNames);
        if (matchSemester.match) {
          semesterId = semesterAll.find(s => s.nama_semester === matchSemester.match)?.id;
        }
      }

      // 3. Construct input for createSiswaCommand
      const createInput: any = {
        nis: getRowValue(row, 'nis', 'NIS'),
        nisn: getRowValue(row, 'nisn', 'NISN'),
        nama_siswa: getRowValue(row, 'nama_siswa', 'nama', 'Nama', 'Nama_Siswa', 'Nama Lengkap'),
        jenis_kelamin: getRowValue(row, 'jenis_kelamin', 'jk', 'JK', 'Gender', 'JK (L/P)'),
        tempat_lahir: getRowValue(row, 'tempat_lahir', 'Tempat_Lahir', 'Tempat Lahir'),
        tanggal_lahir: parseExcelDate(getRowValue(row, 'tanggal_lahir', 'Tanggal_Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir')),
        alamat: getRowValue(row, 'alamat', 'Alamat'),
        no_hp: getRowValue(row, 'no_hp', 'hp', 'HP', 'Telepon', 'No. HP'),
        nik: getRowValue(row, 'nik', 'NIK'),
        kelas_id: kelasId,
        jurusan_id: matchedJurusanId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        no_rfid: getRowValue(row, 'no_rfid', 'rfid', 'RFID'),
        nama_ayah: getRowValue(row, 'nama_ayah', 'Ayah', 'Nama Ayah'),
        nama_ibu: getRowValue(row, 'nama_ibu', 'Ibu', 'Nama Ibu'),
        email: getRowValue(row, 'email', 'Email'),
        status: statusInput,
        tanggal_masuk: parseExcelDate(getRowValue(row, 'tanggal_masuk', 'Tanggal_Masuk', 'Tanggal Masuk (YYYY-MM-DD)', 'Tanggal Masuk')),
        tanggal_keluar: parseExcelDate(getRowValue(row, 'tanggal_keluar', 'Tanggal_Keluar', 'Tanggal Keluar (YYYY-MM-DD)', 'Tanggal Keluar'))
      };

      if (!createInput.nama_siswa) throw new Error('Kolom Nama Siswa wajib diisi');

      // 4. Call createSiswaCommand
      await createSiswaCommand(createInput, { tenantId, org: options?.org });
      successCount++;
    } catch (error: any) {
      failedCount++;
      errors.push({
        row: rowNumber,
        error: error.message
      });
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

