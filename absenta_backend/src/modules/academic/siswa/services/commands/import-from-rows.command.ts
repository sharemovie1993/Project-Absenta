import { prisma } from '@/utils/prisma';
import { findBestMatch, parseSmartDate, normalizePhone } from '@/utils/normalization';
import { createSiswaCommand } from './create-siswa.command';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

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
        tanggal_lahir: parseSmartDate(getRowValue(row, 'tanggal_lahir', 'Tanggal_Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir')),
        alamat: getRowValue(row, 'alamat', 'Alamat'),
        no_hp: normalizePhone(getRowValue(row, 'no_hp', 'hp', 'HP', 'Telepon', 'No. HP')),
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
        tanggal_masuk: parseSmartDate(getRowValue(row, 'tanggal_masuk', 'Tanggal_Masuk', 'Tanggal Masuk (YYYY-MM-DD)', 'Tanggal Masuk')),
        tanggal_keluar: parseSmartDate(getRowValue(row, 'tanggal_keluar', 'Tanggal_Keluar', 'Tanggal Keluar (YYYY-MM-DD)', 'Tanggal Keluar'))
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

  if (successCount > 0) {
    await cacheInvalidationService.invalidateSiswaCache(tenantId);
  }

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

