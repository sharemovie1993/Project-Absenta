import { prisma } from '../utils/prisma';
import { sesiService } from '../modules/attendance/sesi-absensi/services/sesi.service';
import { organizationalAuthorizationEngine } from '../modules/auth/services/organizational-authorization.engine';

async function testSesiList() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const guru = await prisma.guru.findFirst({
    where: { tenant_id: tenantId, nama_guru: { contains: 'HIMAL' } }
  });

  const org = await organizationalAuthorizationEngine.resolveOrganizationalContext(guru!.user_id!);

  // Test list with guru_id = 'me'
  const listWithGuruMe = await sesiService.list(tenantId, org, {
    tanggal: '2026-07-28',
    summary: 'true',
    guru_id: 'me',
    currentUserId: guru!.user_id
  });

  console.log('=== LIST WITH GURU_ID = ME ===');
  console.log(JSON.stringify(listWithGuruMe, null, 2));

  // Test list WITHOUT guru_id (default query)
  const listDefault = await sesiService.list(tenantId, org, {
    tanggal: '2026-07-28',
    summary: 'true',
    currentUserId: guru!.user_id
  });

  console.log('=== LIST DEFAULT ===');
  console.log(JSON.stringify(listDefault, null, 2));
}

testSesiList().catch(console.error).finally(() => prisma.$disconnect());
