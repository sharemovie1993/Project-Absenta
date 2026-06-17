const { PrismaClient } = require('@prisma/client');
// We need to import the function, but since it's TS, we'll just replicate the logic for a quick test
const prisma = new PrismaClient();

async function triggerManually() {
  const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
  const localDateStr = '2026-04-16';
  const tz = 'Asia/Jakarta'; // Default for Cimahi

  console.log(`Manually triggering session generation for ${tenantId} on ${localDateStr}...`);

  try {
    // We'll just call the logic or check if it SHOULD work
    // Since I can't easily import the TS service here without complex setup, 
    // I will check the SesiGerbang creation logic specifically.
    
    // SesiGerbang is unique by (tenant_id, tanggal)
    // SesiAbsensi is created from templates.
    
    // Let's check if SesiGerbang for today ALREADY failed or something.
    const sesiGerbang = await prisma.sesiGerbang.findUnique({
        where: {
            tenant_id_tanggal: {
                tenant_id: tenantId,
                tanggal: new Date(localDateStr + 'T00:00:00Z')
            }
        }
    });
    
    if (sesiGerbang) {
        console.log('SesiGerbang already exists:', sesiGerbang.id);
    } else {
        console.log('SesiGerbang DOES NOT exist. This is the main issue for Gate Attendance.');
        
        // Let's see why it wasn't created. 
        // In some implementations, SesiGerbang is created by getOrCreateSessionInfo.
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

triggerManually();
