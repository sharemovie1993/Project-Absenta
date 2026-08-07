import { waOnboardingService } from '../services/wa-onboarding.service';

export class WaOnboardingController {
  async getOnboardingUsers(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id || req.query?.tenant_id;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan.' });
      }

      const { role, status, search, page, limit } = req.query || {};

      const result = await waOnboardingService.getOnboardingUsers(tenantId, {
        role,
        status,
        search,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return reply.send({
        success: true,
        data: result.items,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (err: any) {
      console.error('[WaOnboardingController] Error getOnboardingUsers:', err);
      return reply.status(500).send({ success: false, message: err.message || 'Gagal memuat data onboarding pengguna WA.' });
    }
  }

  async sendGreeting(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan.' });
      }

      const body = req.body || {};
      if (!body.no_hp || !body.userType || !body.nama) {
        return reply.status(400).send({ success: false, message: 'Parameter userType, nama, dan no_hp wajib diisi.' });
      }

      const result = await waOnboardingService.sendGreeting(tenantId, {
        userType: body.userType,
        nama: body.nama,
        no_hp: body.no_hp,
        detailInfo: body.detailInfo,
        customMessage: body.customMessage,
      });

      return reply.send(result);
    } catch (err: any) {
      console.error('[WaOnboardingController] Error sendGreeting:', err);
      return reply.status(500).send({ success: false, message: err.message || 'Gagal mengirim pesan sapaan WA.' });
    }
  }

  async sendGreetingBulk(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan.' });
      }

      const body = req.body || {};

      const result = await waOnboardingService.sendGreetingBulk(tenantId, {
        role: body.role,
        search: body.search,
      });

      return reply.send(result);
    } catch (err: any) {
      console.error('[WaOnboardingController] Error sendGreetingBulk:', err);
      return reply.status(500).send({ success: false, message: err.message || 'Gagal mengirim pesan sapaan WA secara masif.' });
    }
  }
}

export const waOnboardingController = new WaOnboardingController();
