import { gerbangService } from '../services/gerbang.service';

export class GerbangSyncController {
  private static instance: GerbangSyncController;

  public static getInstance(): GerbangSyncController {
    if (!GerbangSyncController.instance) {
      GerbangSyncController.instance = new GerbangSyncController();
    }
    return GerbangSyncController.instance;
  }

  async syncOfflineTaps(req: any, reply: any) {
    try {
      const { taps } = req.body as { taps: any[] };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await gerbangService.syncOfflineTaps(tenantId, taps || []);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }
}

export const gerbangSyncController = GerbangSyncController.getInstance();
