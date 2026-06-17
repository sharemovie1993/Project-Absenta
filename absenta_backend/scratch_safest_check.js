const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    
    console.log('Final check with correct field identification...');

    // Just get the counts first to be absolutely safe
    const countTotal = await prisma.sesiAbsensi.count({ where: { tenant_id: tenantId } });
    console.log('Total sessions in DB for this tenant:', countTotal);

    // List latest 10 sessions with minimal fields
    const sessions = await prisma.sesiAbsensi.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        tanggal: true,
        created_at: true,
        jam_masuk: true
      }
    });

    console.log('\nLatest 10 Sessions Created:');
    sessions.forEach(s => {
      console.log(`- ID: ${s.id} | Tanggal (DB): ${s.tanggal.toISOString()} | CreatedAt: ${s.created_at.toISOString()} | Jam: ${s.jam_masuk}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
