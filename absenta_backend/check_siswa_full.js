const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSiswaFull() {
  const siswaId = '11ef92f8-3da8-40b9-953d-d7f83196b9f8';
  
  const gerbang = await prisma.absenGerbangSiswa.findMany({
    where: { siswa_id: siswaId }
  });
  console.log('AbsenGerbangSiswa Count:', gerbang.length);

  const sesiSiswa = await prisma.absenSiswa.findMany({
    where: { siswa_id: siswaId }
  });
  console.log('AbsenSiswa (Sesi) Count:', sesiSiswa.length);

  const pelanggaran = await prisma.pelanggaranSiswa.findMany({
    where: { siswa_id: siswaId }
  });
  console.log('PelanggaranSiswa Count:', pelanggaran.length);

  const prestasi = await prisma.prestasiSiswa.findMany({
    where: { siswa_id: siswaId }
  });
  console.log('PrestasiSiswa Count:', prestasi.length);

  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    select: { kelas_id: true }
  });

  if (siswa?.kelas_id) {
    const jadwal = await prisma.jadwalKBM.findMany({
      where: { kelas_id: siswa.kelas_id },
      include: { mapel: true, guru: true }
    });
    console.log('JadwalKBM Count:', jadwal.length);
    console.log('Jadwal List:', jadwal.map(j => ({
      hari: j.hari,
      mapel: j.mapel?.nama_mapel,
      guru: j.guru?.nama_guru,
      jam: `${j.jam_mulai} - ${j.jam_selesai}`
    })));
  }
}

checkSiswaFull()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
