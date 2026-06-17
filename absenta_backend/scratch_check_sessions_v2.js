const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, domain: true }
    });
    console.log('All Tenants:', JSON.stringify(tenants, null, 2));

    const tenant = tenants.find(t => 
      (t.domain && t.domain.includes('smkn1cimahi')) || 
      (t.name && t.name.toLowerCase().includes('smkn 1 cimahi'))
    );

    if (!tenant) {
      console.log('Tenant for smkn1cimahi not found in the list above.');
      return;
    }

    console.log(`\nUsing Tenant: ${tenant.name} (${tenant.id})`);

    const dateStr = '2026-04-16';
    
    // Check SesiGerbang
    // The schema says SesiGerbang.tanggal is Timestamptz
    const sesiGerbang = await prisma.sesiGerbang.findMany({
      where: {
        tenant_id: tenant.id,
        tanggal: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z')
        }
      }
    });

    // Check sesiAbsensi
    const sesiAbsensi = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenant.id,
        tanggal: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z')
        }
      }
    });

    console.log('\n--- Result for 2026-04-16 ---');
    console.log(`Total SesiGerbang found: ${sesiGerbang.length}`);
    if (sesiGerbang.length > 0) {
      sesiGerbang.forEach(s => console.log(`- [SesiGerbang] ID: ${s.id}, Status: ${s.status}, Jam Mulai: ${s.waktu_mulai}`));
    }

    console.log(`Total SesiAbsensi found: ${sesiAbsensi.length}`);
    if (sesiAbsensi.length > 0) {
      sesiAbsensi.forEach(s => console.log(`- [SesiAbsensi] ID: ${s.id}, Nama: ${s.nama_sesi || 'N/A'}, Jam Masuk: ${s.jam_masuk}`));
    }

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
