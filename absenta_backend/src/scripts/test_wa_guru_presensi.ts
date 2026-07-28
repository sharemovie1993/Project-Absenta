import { prisma } from '../utils/prisma';

async function main() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const guru = await prisma.guru.findFirst({
    where: { tenant_id: tenantId, nama_guru: { contains: 'HIMAL' } }
  });

  if (!guru) {
    console.log('Guru not found!');
    return;
  }

  console.log('Found Guru:', guru.id, guru.nama_guru);

  // Timezone WIB calculations
  const now = new Date();
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  const nowWib = new Date(wibMs);
  
  const y = nowWib.getFullYear();
  const m = nowWib.getMonth();
  const d = nowWib.getDate();

  const startToday = new Date(Date.UTC(y, m, d, -7, 0, 0, 0));
  const endToday = new Date(Date.UTC(y, m, d, 16, 59, 59, 999));
  const firstDayMonth = new Date(Date.UTC(y, m, 1, -7, 0, 0, 0));

  console.log('Start Today WIB:', startToday.toISOString());
  console.log('End Today WIB:', endToday.toISOString());
  console.log('First Day Month WIB:', firstDayMonth.toISOString());

  // 1. Today's Gate Attendance
  const gerbangToday = await prisma.absenGerbangGuru.findMany({
    where: {
      guru_id: guru.id,
      created_at: { gte: startToday, lte: endToday }
    }
  });
  console.log('Gerbang Today:', JSON.stringify(gerbangToday, null, 2));

  // 2. Today's KBM Sessions
  const sesiToday = await prisma.sesiAbsensi.findMany({
    where: {
      guru_id: guru.id,
      tanggal: { gte: startToday, lte: endToday }
    },
    include: { AbsenGuru: true }
  });
  console.log('Sesi KBM Today Count:', sesiToday.length);

  // 3. Monthly Gate Summary
  const gerbangMonth = await prisma.absenGerbangGuru.findMany({
    where: {
      guru_id: guru.id,
      created_at: { gte: firstDayMonth }
    }
  });
  console.log('Gerbang Month Count:', gerbangMonth.length);

  // 4. Monthly KBM Summary
  const sesiMonth = await prisma.absenGuru.findMany({
    where: {
      guru_id: guru.id,
      created_at: { gte: firstDayMonth }
    }
  });
  console.log('AbsenGuru Month Count:', sesiMonth.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
