const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26'; // SMKN 1 Plered
  console.log('=== TENANT ===');
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  console.log('Tenant:', tenant?.name, 'ID:', tenant?.id);

  console.log('\n=== USERS ===');
  const gerbangUser = await prisma.user.findFirst({
    where: { email: 'suhermat@gmail.com' },
    select: { id: true, email: true, tenant_id: true, role_id: true }
  });
  const kelasUser = await prisma.user.findFirst({
    where: { email: 'aaj@gmail.com' },
    select: { id: true, email: true, tenant_id: true, role_id: true }
  });
  console.log('Petugas Gerbang User:', gerbangUser);
  console.log('Petugas Kelas User:', kelasUser);

  console.log('\n=== SISWA OBJECT (NISN: 1122558890) ===');
  const siswa = await prisma.siswa.findFirst({
    where: { nisn: '1122558890' },
    select: { id: true, nama_siswa: true, nisn: true, tenant_id: true, kelas_id: true, user_id: true }
  });
  console.log('Siswa:', siswa);
  if (siswa) {
    const siswaAkademik = await prisma.siswaAkademik.findFirst({
      where: { siswa_id: siswa.id }
    });
    console.log('SiswaAkademik:', siswaAkademik?.id, 'Status:', siswaAkademik?.status);
    const kelas = await prisma.kelas.findUnique({ where: { id: siswa.kelas_id } });
    console.log('Kelas:', kelas?.nama_kelas, 'ID:', kelas?.id);
  }

  console.log('\n=== GURU OBJECT (NIP: 197802000000000000) ===');
  const guru = await prisma.guru.findFirst({
    where: { nip: '197802000000000000' },
    select: { id: true, nama_guru: true, nip: true, tenant_id: true, user_id: true }
  });
  console.log('Guru NIP:', guru);

  console.log('\n=== GURU AHMAD HERI ===');
  const ahmadHeri = await prisma.guru.findFirst({
    where: { tenant_id: tenantId, nama_guru: { contains: 'Ahmad Heri' } },
    select: { id: true, nama_guru: true, nip: true, tenant_id: true }
  });
  console.log('Guru Ahmad Heri:', ahmadHeri);

  console.log('\n=== MAPEL MATEMATIKA ===');
  const mapelMat = await prisma.mapel.findFirst({
    where: { tenant_id: tenantId, nama_mapel: { contains: 'Matematika' } },
    select: { id: true, nama_mapel: true, tenant_id: true }
  });
  console.log('Mapel Matematika:', mapelMat);

  console.log('\n=== JADWAL KBM MATEMATIKA / AHMAD HERI ===');
  const jadwalKbm = await prisma.jadwalKBM.findMany({
    where: {
      tenant_id: tenantId,
      OR: [
        { guru_id: ahmadHeri?.id },
        { mapel_id: mapelMat?.id }
      ]
    },
    include: { Kelas: true, Mapel: true, Guru: true }
  });
  console.log('Jadwal KBM Count:', jadwalKbm.length);
  jadwalKbm.forEach(j => {
    console.log(`- [Jadwal ID: ${j.id}] Hari: ${j.hari}, ${j.jam_mulai}-${j.jam_selesai}, Kelas: ${j.Kelas?.nama_kelas}, Mapel: ${j.Mapel?.nama_mapel}, Guru: ${j.Guru?.nama_guru}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
