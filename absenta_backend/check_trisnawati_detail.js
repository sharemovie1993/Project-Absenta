const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkTrisnawatiAllSchedules() {
  // Find Guru record
  const guru = await prisma.guru.findFirst({
    where: {
      nama_guru: { contains: 'trisnawati', mode: 'insensitive' }
    }
  });

  console.log('Guru Record:', guru);

  if (!guru) return;

  const schedules = await prisma.jadwalKBM.findMany({
    where: {
      guru_id: guru.id
    },
    include: {
      Kelas: true,
      Mapel: true,
      MasterRuangan: true,
    },
    orderBy: [
      { hari: 'asc' },
      { slot_index: 'asc' }
    ]
  });

  console.log(`\n======================================================`);
  console.log(`TOTAL JADWAL DI DB UNTUK GURU ${guru.nama_guru}: ${schedules.length}`);
  console.log(`======================================================`);

  schedules.forEach(s => {
    console.log(`ID: ${s.id} | Hari: ${s.hari} | Slot: ${s.slot_index} (${s.jam_mulai} - ${s.jam_selesai}) | Kelas: ${s.Kelas?.nama_kelas} (id: ${s.kelas_id}) | Mapel: ${s.Mapel?.nama_mapel} | asc_id: ${s.asc_id}`);
  });

  // Check specifically for XII TP 1
  const kelasXiiTp1 = await prisma.kelas.findFirst({
    where: {
      nama_kelas: { contains: 'XII TP 1', mode: 'insensitive' }
    }
  });
  console.log('\nKelas XII TP 1 Record:', kelasXiiTp1);

  if (kelasXiiTp1) {
    const xiiTp1Schedules = await prisma.jadwalKBM.findMany({
      where: {
        kelas_id: kelasXiiTp1.id
      },
      include: {
        Guru: true,
        Mapel: true
      },
      orderBy: [
        { hari: 'asc' },
        { slot_index: 'asc' }
      ]
    });

    console.log(`\n======================================================`);
    console.log(`TOTAL JADWAL DI KELAS XII TP 1 (${kelasXiiTp1.nama_kelas}): ${xiiTp1Schedules.length}`);
    console.log(`======================================================`);
    xiiTp1Schedules.forEach(s => {
      console.log(`Hari: ${s.hari} | Slot: ${s.slot_index} (${s.jam_mulai} - ${s.jam_selesai}) | Guru: ${s.Guru?.nama_guru} | Mapel: ${s.Mapel?.nama_mapel} | asc_id: ${s.asc_id}`);
    });
  }
}

checkTrisnawatiAllSchedules().catch(console.error).finally(() => prisma.$disconnect());
