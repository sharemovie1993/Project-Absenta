import { guruRekapService } from '../services/guru-rekap.service';

export class GuruRekapController {
  private static instance: GuruRekapController;

  public static getInstance(): GuruRekapController {
    if (!GuruRekapController.instance) {
      GuruRekapController.instance = new GuruRekapController();
    }
    return GuruRekapController.instance;
  }

  async getRekapHarianGuru(req: any, reply: any) {
    try {
      const { tanggal, guru_id } = req.query as { tanggal: string; guru_id?: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await guruRekapService.getRekapHarianGuru(tanggal, tenantId, guru_id);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async getTrackingHarianGuru(req: any, reply: any) {
    try {
      const { guru_id } = req.params as { guru_id: string };
      const { tanggal } = req.query as { tanggal: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await guruRekapService.getTrackingHarianGuru(guru_id, tanggal, tenantId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async getRekapBulananGuruMe(req: any, reply: any) {
    try {
      const userId = (req.user as any)?.id;
      const { bulan } = req.query as { bulan: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await guruRekapService.getRekapBulananGuruMe(userId, tenantId, bulan);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }
}

export const guruRekapController = GuruRekapController.getInstance();
