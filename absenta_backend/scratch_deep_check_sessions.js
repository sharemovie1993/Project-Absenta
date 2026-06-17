const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    
    console.log('Fetching ALL SesiAbsensi for tenant to investigate raw date storage...');
    
    // Get the most recent 50 sessions
    const sessions = await prisma.sesiAbsensi.findMany({
      where: { tenant_id: tenantId },
      orderBy: { tanggal: 'desc' },
      take: 50,
      select: {
        id: true,
        nama_sesi: true,
        tanggal: true,
        waktu_mulai: true,
        jam_masuk: true
      }
    });

    console.log(`Found ${sessions.length} sessions total.`);
    
    const CimahiTodayStart = new Date('2026-04-16T00:00:00+07:00');
    const CimahiTodayEnd = new Date('2026-04-16T23:59:59+07:00');

    console.log(`\nFiltering for Cimahi Date: 2026-04-16 (UTC+7 Range: ${CimahiTodayStart.toISOString()} to ${CimahiTodayEnd.toISOString()})`);

    const matching = sessions.filter(s => {
      const d = new Date(s.tanggal);
      return d >= CimahiTodayStart && d <= CimahiTodayEnd;
    });

    console.log(`Found ${matching.length} sessions matching 2026-04-16 in Cimahi time.`);
    
    if (matching.length > 0) {
      console.log('\nSample Matching Sessions:');
      matching.slice(0, 5).forEach(s => {
        console.log(`- ID: ${s.id} | Nama: ${s.nama_sesi} | Raw Tanggal: ${s.tanggal.toISOString()} | Jam Masuk: ${s.jam_masuk}`);
      });
    } else {
      console.log('\nNo matches. Listing the latest few from the DB regardless of match:');
      sessions.slice(0, 5).forEach(s => {
        console.log(`- ID: ${s.id} | Nama: ${s.nama_sesi} | Raw Tanggal: ${s.tanggal.toISOString()}`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
