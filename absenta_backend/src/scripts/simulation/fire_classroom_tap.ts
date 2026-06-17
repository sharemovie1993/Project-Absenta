import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const sessionId = args[0];
  const siswaId = args[1];

  if (!sessionId || !siswaId) throw new Error('Missing Session ID or Siswa ID');

  const session = await prisma.sesiAbsensi.findUnique({
    where: { id: sessionId },
    include: { Tenant: true }
  });
  if (!session) throw new Error('Session not found');

  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId }
  });
  if (!siswa) throw new Error('Student not found');

  const today = new Date();
  today.setHours(0,0,0,0);

  // Find SiswaAkademik
  const sa = await prisma.siswaAkademik.findFirst({
    where: { 
      siswa_id: siswaId, 
      tahun_pelajaran_id: session.tahun_pelajaran_id, 
      semester_id: session.semester_id
    }
  });

  console.log(`Inserting PENDING tap for ${siswa.nama_siswa}`);

  await prisma.absenSiswa.create({
    data: {
      tenant_id: session.tenant_id,
      sesi_id: session.id,
      siswa_id: siswaId,
      siswa_akademik_id: sa?.id || '',
      status: 'H',
      waktu_tap: new Date(),
      asal_gerbang: false, // THIS IS THE KEY FOR "SYNCING" STATUS
      kelas_id_snapshot: session.kelas_id,
      tahun_pelajaran_id_snapshot: session.tahun_pelajaran_id
    }
  });

  console.log('--- TAP INSERTED ---');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
