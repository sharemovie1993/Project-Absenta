const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    
    // Check sessions for today (range: last 24h to future 24h just to be safe)
    const sessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        Kelas: { select: { nama_kelas: true } },
        Mapel: { select: { nama: true } }
      }
    });

    console.log(`Found ${sessions.length} sessions created in the last 24 hours.`);
    
    if (sessions.length > 0) {
      sessions.forEach(s => {
        console.log(`- ID: ${s.id} | Kelas: ${s.Kelas?.nama_kelas} | Mapel: ${s.Mapel?.nama} | Tanggal: ${s.tanggal.toISOString()} | Jam: ${s.jam_masuk}`);
      });
    }

    // Check SesiGerbang too
    const gerbang = await prisma.sesiGerbang.findMany({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log(`Found ${gerbang.length} SesiGerbang created in the last 24 hours.`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
