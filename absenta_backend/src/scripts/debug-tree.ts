import { PrismaClient } from '@prisma/client';
import { strukturOrganisasiService } from '../modules/academic/struktur-organisasi/services/struktur-organisasi.service';

const prisma = new PrismaClient();

async function check() {
  const tenantId = 'demo-tenant-absenta';
  console.log('=== DEBUG STRUKTUR TREE FOR TENANT:', tenantId);

  const tree = await strukturOrganisasiService.getTree(tenantId);
  console.log('TREE KEYS:', Object.keys(tree));
  for (const k of Object.keys(tree)) {
    console.log(`- Key: ${k.padEnd(20)} | Items count: ${tree[k]?.length}`);
    if (k === 'KEPALA_SEKOLAH' || k === 'KURIKULUM' || k === 'PIMPINAN') {
      console.log('  Items:', JSON.stringify(tree[k], null, 2));
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
