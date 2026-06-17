const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'smkn1cimahi' },
      select: { id: true, name: true }
    });

    if (!tenant) {
      console.log('Tenant smkn1cimahi not found.');
      return;
    }

    console.log(`Checking sessions for Tenant: ${tenant.name} (${tenant.id})`);

    const dateStr = '2026-04-16';
    
    // Check SesiGerbang
    const sesiGerbang = await prisma.sesiGerbang.findMany({
      where: {
        tenant_id: tenant.id,
        tanggal: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z')
        }
      }
    });

    // Check SesiAbsensi (standard class attendance)
    const sesiAbsensi = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenant.id,
        tanggal: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z')
        }
      }
    });

    console.log('--- Result ---');
    console.log(`Total SesiGerbang found: ${sesiGerbang.length}`);
    if (sesiGerbang.length > 0) {
      sesiGerbang.forEach(s => console.log(`- SesiGerbang: ID=${s.id}, Status=${s.status}, Tanggal=${s.tanggal}`));
    }

    console.log(`Total SesiAbsensi found: ${sesiAbsensi.length}`);
    if (sesiAbsensi.length > 0) {
      sesiAbsensi.forEach(s => console.log(`- SesiAbsensi: ID=${s.id}, Nama=${s.nama_sesi || 'N/A'}, Tanggal=${s.tanggal}`));
    }

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
