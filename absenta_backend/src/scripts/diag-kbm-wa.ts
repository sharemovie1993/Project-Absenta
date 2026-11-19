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

  // 2. Cek Config kbm_wa_notification
  const kbmConfig = await prisma.config.findFirst({
    where: { tenant_id: tenantId, key: 'kbm_wa_notification' }
  });
  console.log('Config kbm_wa_notification:', kbmConfig?.value || 'BELUM DIKONFIGURASI (NULL)');

  // 3. Sesi terakhir
  const recentSesis = await prisma.sesiAbsensi.findMany({
    where: { tenant_id: tenantId },
    orderBy: { updated_at: 'desc' },
    take: 5
  });
  console.log('5 Sesi Terakhir:', JSON.stringify(recentSesis.map(s => ({
    id: s.id,
    guru_id: s.guru_id,
    guru_pelaksana_id: s.guru_pelaksana_id,
    kelas_id: s.kelas_id,
    mapel_id: s.mapel_id,
    status: s.status,
    has_foto: Boolean(s.foto_kegiatan),
    foto_preview: s.foto_kegiatan ? s.foto_kegiatan.substring(0, 50) + '...' : null,
    waktu_mulai: s.waktu_mulai,
    updated_at: s.updated_at
  })), null, 2));

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
