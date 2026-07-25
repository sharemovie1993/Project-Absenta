const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSiswaDetails() {
  const siswa = await prisma.siswa.findFirst({
    where: { nis: '2526100001' },
    include: {
      User: true,
      Kelas: true
    }
  });

  console.log('=== SISWA PROFILE ===');
  console.log({
    id: siswa.id,
    nama_siswa: siswa.nama_siswa,
    nis: siswa.nis,
    nisn: siswa.nisn,
    nama_kelas: siswa.Kelas?.nama_kelas,
    email: siswa.User?.email
  });

  // Check Capabilities of SISWA role
  const siswaRole = await prisma.role.findFirst({
    where: { name: 'SISWA' },
    include: {
      rolePermissions: {
        include: { Permission: true }
      }
    }
  });
  console.log('=== SISWA PERMISSIONS / CAPABILITIES ===');
  const caps = siswaRole?.rolePermissions?.map(rp => rp.Permission?.code || rp.Permission?.name) || [];
  console.log('Capabilities count:', caps.length);
  console.log('Capabilities list:', caps);

  // Check Gerbang Tap Records for this student
  const gerbangTaps = await prisma.gerbangTap.findMany({
    where: { siswa_id: siswa.id },
    take: 5,
    orderBy: { created_at: 'desc' }
  });
  console.log('=== GERBANG TAP RECORDS ===');
  console.log('Count:', gerbangTaps.length);
  console.log(gerbangTaps);

  // Check Pelanggaran Records for this student
  const pelanggaran = await prisma.pelanggaranSiswa.findMany({
    where: { siswa_id: siswa.id },
    take: 5
  });
  console.log('=== PELANGGARAN RECORDS ===');
  console.log('Count:', pelanggaran.length);
  console.log(pelanggaran);

  // Check Jadwal KBM for class X KUL
  if (siswa.kelas_id) {
    const jadwal = await prisma.jadwalKbm.findMany({
      where: { kelas_id: siswa.kelas_id },
      take: 10,
      include: { MataPelajaran: true, Guru: true }
    });
    console.log('=== JADWAL KBM FOR KELAS X KUL ===');
    console.log('Count:', jadwal.length);
    console.log(jadwal.map(j => ({
      hari: j.hari,
      mapel: j.MataPelajaran?.nama_mapel,
      guru: j.Guru?.nama_guru,
      jam_ke: j.jam_ke
    })));
  }
}

checkSiswaDetails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
