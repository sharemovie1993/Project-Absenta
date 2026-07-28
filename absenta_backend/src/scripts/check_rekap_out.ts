import { prisma } from '../utils/prisma';
import { rekapService } from '../modules/attendance/rekap/services/rekap.service';

async function checkRekap() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const guru = await prisma.guru.findFirst({
    where: { tenant_id: tenantId, nama_guru: { contains: 'HIMAL' } }
  });

  const rekap = await rekapService.getRekapBulananGuruMe(guru!.user_id!, tenantId, '2026-07');
  console.log('=== FULL REKAP DATA ===');
  console.log(JSON.stringify(rekap, null, 2));
}

checkRekap().catch(console.error).finally(() => prisma.$disconnect());
