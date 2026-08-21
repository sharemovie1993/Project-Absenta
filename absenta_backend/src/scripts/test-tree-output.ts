import { strukturOrganisasiService } from '../modules/academic/struktur-organisasi/services/struktur-organisasi.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'demo-tenant-absenta';
  const data = await strukturOrganisasiService.getTree(tenantId);

  console.log('--- TEST DATA RETURNED FROM SERVICE ---');
  console.log('Object.keys(data):', Object.keys(data));
  console.log('Kepsek in data:', !!data['KEPALA_SEKOLAH']);
  console.log('Kurikulum in data:', !!data['KURIKULUM']);
  console.log('Kaprog in data:', !!data['KAPROG']);
}

main().catch(console.error).finally(() => prisma.$disconnect());
