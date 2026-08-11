import { gerbangService } from '../services/gerbang.service';
import { FaceVerifyInput, FaceEnrollInput } from '../types/gerbang.types';
import { AbsensiMode } from '../../../../constants/enums';

export class GerbangFaceController {
  private static instance: GerbangFaceController;

  public static getInstance(): GerbangFaceController {
    if (!GerbangFaceController.instance) {
      GerbangFaceController.instance = new GerbangFaceController();
    }
    return GerbangFaceController.instance;
  }

  async faceVerifyTap(req: any, reply: any) {
    try {
      const input = req.body as FaceVerifyInput;
      const userId = (req.user as any)?.id || 'SYSTEM';
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;
      const mode = (req.query as any)?.mode as AbsensiMode;

      const result = await gerbangService.faceVerifyTap(input, userId, tenantId, mode);
      return reply.code(result.success ? 200 : 400).send(result);
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async faceEnroll(req: any, reply: any) {
    try {
      const input = req.body as FaceEnrollInput;
      const userId = (req.user as any)?.id || 'SYSTEM';
      const tenantId = (req.user as any)?.tenant_id || (req.query as any)?.tenant_id;

      const result = await gerbangService.faceEnroll(input, userId, tenantId);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }

  async embeddingProviderHealth(_req: any, reply: any) {
    try {
      const result = await gerbangService.embeddingProviderHealth();
      return reply.send(result);
    } catch (err: any) {
      return reply.code(500).send({ success: false, message: err.message });
    }
  }
}

export const gerbangFaceController = GerbangFaceController.getInstance();
