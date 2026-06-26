import { PrismaClient } from '@prisma/client';
import { BkService } from '../src/modules/kesiswaan/services/bk.service';

const prisma = new PrismaClient();

async function test() {
  console.log('--- Testing Wali Kelas BK Dashboard Service ---');
  
  // Find active Wali Kelas assignment
  const assignment = await prisma.organizationalAssignment.findFirst({
    where: {
      Position: { code: 'WALIKELAS' },
      is_active: true
    },
    include: {
      User: true,
      Kelas: true
    }
  });

  if (!assignment) {
    console.error('❌ No active Wali Kelas assignment found.');
    return;
  }

  const userId = assignment.user_id;
  const tenantId = assignment.tenant_id;

  console.log(`✅ Found Wali Kelas assignment:`);
  console.log(`- User: ${assignment.User?.full_name} (${userId})`);
  console.log(`- Kelas: ${assignment.Kelas?.nama_kelas} (${assignment.kelas_id})`);
  console.log(`- Tenant: ${tenantId}`);

  try {
    const data = await BkService.getWaliKelasDashboardData(tenantId, userId);
    console.log('\n✅ Service returned Wali Kelas Dashboard Data successfully:');
    console.log(`- Kelas Binaan: ${data.kelas}`);
    console.log(`- Active Cases: ${data.activeCasesCount}`);
    console.log(`- Pending Summons: ${data.pendingSummonsCount}`);
    console.log(`- Critical Students Found: ${data.siswaKritis.length}`);
    console.log(`- Total Cases Details Fetched: ${data.cases.length}`);
    console.log(`- Total Summons Details Fetched: ${data.summons.length}`);
    console.log(`- Trend Points Count: ${data.trend.length}`);

    if (data.siswaKritis.length > 0) {
      console.log('\n--- Critical Students Sample ---');
      console.log(data.siswaKritis.slice(0, 3));
    }
    
    if (data.cases.length > 0) {
      console.log('\n--- Cases Sample (Non-Sensitive only) ---');
      console.log(data.cases.slice(0, 3).map(c => ({
        id: c.id,
        judul: c.judul,
        kategori: c.kategori,
        siswa: c.nama_siswa
      })));
    }
  } catch (error) {
    console.error('❌ Error executing getWaliKelasDashboardData:', error);
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
