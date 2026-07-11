import { prisma } from '../utils/prisma';

async function main() {
  console.log('--- CHECK STUDENT STATUS ---');

  const siswa = await prisma.siswa.findFirst({
    where: {
      nama_siswa: {
        contains: 'Fadly Muhammad Gibran',
        mode: 'insensitive'
      }
    },
    include: {
      Kelas: true,
      SiswaAkademik: true
    }
  });

  if (!siswa) {
    console.error('Siswa Fadly Muhammad Gibran not found!');
    return;
  }

  console.log('Siswa Details:');
  console.log('ID:', siswa.id);
  console.log('Nama:', siswa.nama_siswa);
  console.log('Status utama (tabel Siswa):', siswa.status);
  console.log('Kelas ID:', siswa.kelas_id);
  console.log('Kelas Nama:', siswa.Kelas?.nama_kelas);
  console.log('Tahun Pelajaran ID:', siswa.tahun_pelajaran_id);
  console.log('Semester ID:', siswa.semester_id);
  console.log('SiswaAkademik records count:', siswa.SiswaAkademik.length);
  console.log('SiswaAkademik records:', siswa.SiswaAkademik);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
