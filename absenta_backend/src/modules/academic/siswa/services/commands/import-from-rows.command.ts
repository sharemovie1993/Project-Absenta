import { prisma } from '@/utils/prisma';
import { findBestMatch } from '@/utils/normalization';
import { createSiswaCommand } from './create-siswa.command';

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
      const statusInput = String(row.status || row.Status || 'AKTIF').trim().toUpperCase();
      const isCalon = statusInput === 'CALON';

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

      // Resolve Kelas if NOT CALON
      let kelasId: string | undefined = undefined;
      if (!isCalon) {
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
        nis: row.nis || row.NIS,
        nisn: row.nisn || row.NISN,
        nama_siswa: row.nama_siswa || row.nama || row.Nama || row.Nama_Siswa,
        jenis_kelamin: row.jenis_kelamin || row.jk || row.JK || row.Gender,
        tempat_lahir: row.tempat_lahir || row.Tempat_Lahir,
        tanggal_lahir: row.tanggal_lahir || row.Tanggal_Lahir,
        alamat: row.alamat || row.Alamat,
        no_hp: row.no_hp || row.hp || row.HP || row.Telepon,
        nik: row.nik || row.NIK,
        kelas_id: kelasId,
        jurusan_id: matchedJurusanId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        no_rfid: row.no_rfid || row.rfid || row.RFID,
        nama_ayah: row.nama_ayah || row.Ayah,
        nama_ibu: row.nama_ibu || row.Ibu,
        email: row.email || row.Email,
        status: statusInput
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

