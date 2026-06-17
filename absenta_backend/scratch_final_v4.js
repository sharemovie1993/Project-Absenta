const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    
    // Find sessions created recently (since yesterday evening)
    const sessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        tanggal: true,
        waktu_mulai: true,
        created_at: true
      }
    });

    console.log(`Sessions found: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`- ID: ${s.id} | Tanggal: ${s.tanggal.toISOString()} | Waktu Mulai: ${s.waktu_mulai.toISOString()} | Created: ${s.created_at.toISOString()}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
