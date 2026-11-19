process.env.SERVICE_ROLE = 'api';
import { prisma } from '../utils/prisma';
import { waGatewayService } from '../services/wa-gateway.service';

async function main() {
  console.log('=== DIAGNOSA KBM WA NOTIFICATION ===');

  // 1. Cari Guru DADAN HAMDAN
  const gurus = await prisma.guru.findMany({
    where: {
      nama_guru: { contains: 'DADAN HAMDAN', mode: 'insensitive' }
    },
    include: { User: true }
  });
  console.log('Guru DADAN HAMDAN:', JSON.stringify(gurus.map(g => ({
    id: g.id,
    nama: g.nama_guru,
    tenant_id: g.tenant_id,
    user_id: g.user_id,
    email: g.User?.email
  })), null, 2));

  const tenantId = gurus[0]?.tenant_id || '8535b49c-d3fc-4598-922a-7774b49ee7c5';

  // 2. Cek Config kbm_wa_notification di semua tenant
  const allKbmConfigs = await prisma.config.findMany({
    where: { key: 'kbm_wa_notification' }
  });
  console.log('All Config kbm_wa_notification:', JSON.stringify(allKbmConfigs, null, 2));

  // 2b. Cek WaAuthSession tenants
  const authTenants = await prisma.waAuthSession.groupBy({
    by: ['tenant_id'],
    _count: { key_id: true }
  });
  console.log('WaAuthSession Tenants:', JSON.stringify(authTenants, null, 2));

  // 3. Sesi DADAN HAMDAN
  const dadanIds = gurus.map(g => g.id);
  const dadanSesis = await prisma.sesiAbsensi.findMany({
    where: {
      OR: [
        { guru_id: { in: dadanIds } },
        { guru_pelaksana_id: { in: dadanIds } }
      ]
    },
    orderBy: { updated_at: 'desc' },
    take: 5
  });
  console.log('Sesi DADAN HAMDAN:', JSON.stringify(dadanSesis, null, 2));

  // 3b. Coba tes panggil notifyKbmSessionOpened langsung untuk sesi ini dan lihat lognya!
  if (dadanSesis.length > 0 && dadanSesis[0].foto_kegiatan) {
    console.log('\n--- TESTING NOTIFY FOR SESI 0 ---');
    const { sesiOpenNotifyService } = await import('../modules/attendance/sesi-absensi/services/sesi-open-notify.service');
    try {
      await sesiOpenNotifyService.notifyKbmSessionOpened(
        dadanSesis[0].tenant_id,
        dadanSesis[0],
        null,
        dadanSesis[0].foto_kegiatan
      );
      console.log('notifyKbmSessionOpened execution finished without crash.');
    } catch (e: any) {
      console.error('notifyKbmSessionOpened EXCEPTION:', e);
    }
  }

  // 4. WA Gateway Health & Groups
  try {
    const health = await waGatewayService.getHealthStatus(tenantId);
    console.log('WA Health:', health);
  } catch (e: any) {
    console.log('WA Health Error:', e.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Diag Error:', err);
  process.exit(1);
});
