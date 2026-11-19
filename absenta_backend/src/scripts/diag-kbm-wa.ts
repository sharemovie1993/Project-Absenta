process.env.SERVICE_ROLE = 'api';
import { prisma } from '../utils/prisma';
import { waGatewayService } from '../services/wa-gateway.service';

async function main() {
  console.log('=== DIAGNOSA KBM WA NOTIFICATION ===');

  // 1. Cek waTenantConnection & whatsappConfig
  const tenantConns = await prisma.waTenantConnection.findMany();
  console.log('waTenantConnection:', JSON.stringify(tenantConns, null, 2));

  const waConfigs = await prisma.whatsappConfig.findMany();
  console.log('whatsappConfig:', JSON.stringify(waConfigs, null, 2));

  // 2. Cek WaAuthSession tenants
  const authTenants = await prisma.waAuthSession.groupBy({
    by: ['tenant_id'],
    _count: { key_id: true }
  });
  console.log('WaAuthSession Tenants:', JSON.stringify(authTenants, null, 2));

  const demoTenantId = '4c1052bb-4296-412b-99e3-3d10800e10ff';
  const realTenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5';

  // 3. Bersihkan sesi demo tenant jika masih ada agar tidak berebut koneksi 440
  const deletedDemoAuth = await prisma.waAuthSession.deleteMany({
    where: { tenant_id: demoTenantId }
  });
  console.log(`Deleted ${deletedDemoAuth.count} auth keys from demo tenant (${demoTenantId})`);

  await prisma.waTenantConnection.updateMany({
    where: { tenant_id: demoTenantId },
    data: { status: 'disconnected', connected_number: null }
  });

  // 4. Cek sesi DADAN HAMDAN di tenant real (SMKN 1 PLERED)
  const dadan = await prisma.guru.findFirst({
    where: {
      nama_guru: { contains: 'DADAN HAMDAN', mode: 'insensitive' },
      tenant_id: realTenantId
    }
  });
  console.log('Guru Dadan SMKN 1 PLERED:', dadan?.id, dadan?.nama_guru);

  const dadanSesi = await prisma.sesiAbsensi.findFirst({
    where: {
      tenant_id: realTenantId,
      guru_id: dadan?.id,
      foto_kegiatan: { not: null }
    },
    orderBy: { updated_at: 'desc' }
  });
  console.log('Sesi DADAN with photo:', dadanSesi?.id, dadanSesi?.foto_kegiatan);

  // 5. Cek WA Health real tenant
  const health = await waGatewayService.getHealthStatus(realTenantId);
  console.log('WA Health SMKN 1 PLERED:', health);

  // 6. Test trigger notifikasi jika ada sesi
  if (dadanSesi && dadanSesi.foto_kegiatan) {
    console.log('\n--- TESTING NOTIFY FOR REAL SESI ---');
    const { sesiOpenNotifyService } = await import('../modules/attendance/sesi-absensi/services/sesi-open-notify.service');
    try {
      await sesiOpenNotifyService.notifyKbmSessionOpened(
        realTenantId,
        dadanSesi,
        null,
        dadanSesi.foto_kegiatan
      );
      console.log('notifyKbmSessionOpened execution finished without crash.');
    } catch (e: any) {
      console.error('notifyKbmSessionOpened EXCEPTION:', e);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Diag Error:', err);
  process.exit(1);
});
