process.env.SERVICE_ROLE = 'api';
import { prisma } from '../utils/prisma';
import { initRedis, verifyRedisConnection } from '../infra/redis/redisClient';
import { waGatewayService } from '../services/wa-gateway.service';

async function main() {
  console.log('=== DIAGNOSA KBM WA NOTIFICATION ===');

  await initRedis();
  await verifyRedisConnection();
  console.log('✅ Redis connected.');

  const realTenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5';

  // 1. Cek WA Health real tenant via RPC ke absenta-wa-service
  const health = await waGatewayService.getHealthStatus(realTenantId);
  console.log('WA Health SMKN 1 PLERED (via RPC):', health);

  // 2. Cek Sesi Dadan
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

  // 3. Test trigger notifikasi langsung via sesiOpenNotifyService
  if (dadanSesi && dadanSesi.foto_kegiatan) {
    console.log('\n--- TESTING NOTIFY FOR REAL SESI VIA REDIS RPC ---');
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
