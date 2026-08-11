import { gerbangService } from '../services/gerbang.service';
import { GerbangTapInput } from '../types/gerbang.types';
import { AbsensiMode } from '../../../../constants/enums';

export class GerbangTapController {
  private static instance: GerbangTapController;

  public static getInstance(): GerbangTapController {
    if (!GerbangTapController.instance) {
      GerbangTapController.instance = new GerbangTapController();
    }
    return GerbangTapController.instance;
  }

  async tap(req: any, reply: any) {
    try {
      const input = req.body as GerbangTapInput;
      const userId = (req.user as any)?.id || 'SYSTEM';
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;
      const mode = (req.query as any)?.mode as AbsensiMode;

      const result = await gerbangService.tap(input, userId, tenantId, mode);
      return reply.code(result.success ? 200 : 400).send(result);
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async getStudentCurrentStatus(req: any, reply: any) {
    try {
      const { siswa_id } = req.params as { siswa_id: string };
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await gerbangService.getStudentCurrentStatus(tenantId, siswa_id);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async getSessionsForDate(req: any, reply: any) {
    try {
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;
      const { tanggal } = req.query as { tanggal?: string };
      const dateParam = tanggal ? new Date(tanggal) : new Date();

      const result = await gerbangService.getSessionsForDate(tenantId, dateParam);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }
}

export const gerbangTapController = GerbangTapController.getInstance();
