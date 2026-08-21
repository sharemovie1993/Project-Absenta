import { strukturOrganisasiService } from '../modules/academic/struktur-organisasi/services/struktur-organisasi.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const tenantId = 'demo-tenant-absenta';
  const data = await strukturOrganisasiService.getTree(tenantId);

  console.log('DATA KEYS:', Object.keys(data));
  console.log('KEPALA_SEKOLAH node:', JSON.stringify(data['KEPALA_SEKOLAH'], null, 2));
  console.log('KURIKULUM node:', JSON.stringify(data['KURIKULUM'], null, 2));
  console.log('KESISWAAN node:', JSON.stringify(data['KESISWAAN'], null, 2));
  console.log('HUBIN node:', JSON.stringify(data['HUBIN'], null, 2));
}

test().catch(console.error).finally(() => prisma.$disconnect());
