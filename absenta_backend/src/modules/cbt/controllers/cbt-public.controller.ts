import { prisma } from '@/utils/prisma';
import { publicPortalService } from '@/modules/public-portal/services/public-portal.service';
import { CbtSettingsService, CbtEventItem } from '../services/cbt-settings.service';

export class CbtPublicController {
  private static async resolveTenant(request: any, reply: any) {
    const params = request.params || {};
    const query = request.query || {};
    const headers = request.headers || {};

    let identifier = params.tenantSlug || query.tenant || headers['x-tenant-host'] || headers['x-tenant-slug'] || headers['x-tenant-id'];

    if (!identifier && headers.host) {
      const host = String(headers.host).split(':')[0].toLowerCase();
      if (host.endsWith('.absenta.id')) {
        identifier = host.replace('.absenta.id', '');
      } else {
        identifier = host;
      }
    }

    if (!identifier) {
      identifier = 'default';
    }

    const tenant = await publicPortalService.resolveTenant(identifier);
    if (!tenant) {
      reply.status(404).send({
        success: false,
        message: `Sekolah atau institusi tidak ditemukan untuk identifier '${identifier}'`,
      });
      return null;
    }

    return tenant;
  }

  /**
   * GET /public/cbt/matriks-soal
   * GET /public/cbt/:tenantSlug/matriks-soal
   * Mengambil data lengkap matriks kesiapan bank soal untuk konsumsi publik (tanpa login)
   */
  static async getPublicMatrix(request: any, reply: any) {
    try {
      const tenant = await CbtPublicController.resolveTenant(request, reply);
      if (!tenant) return;

      const tenantId = tenant.id;

      // 1. Profil Sekolah
      const profile = await prisma.sekolah.findFirst({
        where: { tenant_id: tenantId },
        select: {
          nama: true,
          logo_url: true,
          alamat: true,
          npsn: true,
        },
      });

      // 2. Event CBT & Tahun Pelajaran
      const eventsSummary = await CbtSettingsService.getEventsSummary(tenantId);
      const activeEvent: CbtEventItem | null = eventsSummary.active_event;
      const allEvents: CbtEventItem[] = (eventsSummary.summary || []).flatMap((s) => s.events || []);

      // Dapatkan Tahun Pelajaran Aktif
      const tpList = await prisma.tahunPelajaran.findMany({
        where: { tenant_id: tenantId },
        orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
        select: { id: true, tahun: true, is_active: true },
      });
      const activeTp = activeEvent?.tahun_pelajaran_id
        ? tpList.find((tp: any) => tp.id === activeEvent.tahun_pelajaran_id) || tpList.find((tp: any) => tp.is_active)
        : tpList.find((tp: any) => tp.is_active);

      const targetTpId = activeTp?.id;

      // 3. Penugasan Guru Mapel (Kurikulum)
      const rawGuruMapel = targetTpId
        ? await prisma.guruMapel.findMany({
            where: {
              tenant_id: tenantId,
              tahun_pelajaran_id: targetTpId,
            },
            include: {
              Guru: { select: { id: true, nama_guru: true, no_hp: true } },
              Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true, tingkat: true } },
              Kelas: { select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true } },
            },
            orderBy: [{ created_at: 'asc' }],
          })
        : [];

      // 4. Bank Soal CBT
      const bankList = await prisma.cbtBankSoal.findMany({
        where: {
          tenant_id: tenantId,
        },
        include: {
          Guru: { select: { id: true, nama_guru: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          _count: { select: { Soal: true } },
        },
        orderBy: [{ created_at: 'desc' }],
      });

      // 5. Riwayat Colek WhatsApp
      const nudgeHistory = await CbtSettingsService.getNudgeHistory(tenantId);

      return reply.send({
        success: true,
        data: {
          tenant: {
            id: tenantId,
            nama_sekolah: profile?.nama || 'Sekolah',
            logo_url: profile?.logo_url || null,
            subdomain: tenant.subdomain,
          },
          activeEvent,
          allEvents,
          activeTp: activeTp ? { id: activeTp.id, tahun: activeTp.tahun } : null,
          rawGuruMapel,
          bankList,
          nudgeHistory,
        },
      });
    } catch (error: any) {
      console.error('[CbtPublicController.getPublicMatrix] Error:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal memuat matriks kesiapan bank soal publik',
      });
    }
  }

  /**
   * POST /public/cbt/nudge
   * POST /public/cbt/:tenantSlug/nudge
   * Mencatat riwayat colek WhatsApp dari halaman publik
   */
  static async recordPublicNudge(request: any, reply: any) {
    try {
      const tenant = await CbtPublicController.resolveTenant(request, reply);
      if (!tenant) return;

      const { target_key, sender_name } = request.body || {};
      if (!target_key) {
        return reply.status(400).send({ success: false, message: 'target_key wajib disertakan' });
      }

      const updatedHistory = await CbtSettingsService.recordNudge(
        tenant.id,
        target_key,
        sender_name || 'Panitia CBT (Public)'
      );

      return reply.send({ success: true, data: updatedHistory });
    } catch (error: any) {
      console.error('[CbtPublicController.recordPublicNudge] Error:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal mencatat riwayat colek',
      });
    }
  }
}
