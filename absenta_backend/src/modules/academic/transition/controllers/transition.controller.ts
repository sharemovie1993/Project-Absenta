import { appLogger } from '@/utils/app-logger';
import { transitionService, TransitionPreviewInput } from '../services/transition.service';
import { DataScope } from '../../../../types/fastify';

class TransitionController {
  async preview(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      if (!scope.tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const input = request.body as TransitionPreviewInput;
      if (!input?.tahunPelajaranLamaId || !input?.tahunPelajaranBaruId) {
        return reply.status(400).send({ success: false, message: 'Invalid payload', data: null });
      }
      const result = await transitionService.preview(scope, input);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      appLogger.error({ err: e }, 'Controller error');
      console.error('TRANSITION PREVIEW ERROR:', e);
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }

  async execute(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope;
      if (!scope.tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const input = request.body as TransitionPreviewInput;
      if (!input?.tahunPelajaranLamaId || !input?.tahunPelajaranBaruId) {
        return reply.status(400).send({ success: false, message: 'Invalid payload', data: null });
      }
      const result = await transitionService.execute(scope, input, request.user?.id);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      appLogger.error({ err: e }, 'Controller error');
      console.error('TRANSITION EXECUTE ERROR:', e);
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }

  /**
   * GET /academic/transition/detect-missing-classes
   * Detect active source classes that have no matching class at (tingkat + 1).
   */
  async detectMissingClasses(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope;
      if (!scope.tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }
      const result = await transitionService.detectMissingNextClasses(scope.tenantId);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      appLogger.error({ err: e }, 'Controller error');
      console.error('TRANSITION DETECT MISSING ERROR:', e);
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }

  /**
   * POST /academic/transition/create-next-grade-classes
   * Auto-create next-grade classes from confirmed list.
   * Body: { classes: [{ sourceKelasId: string, namaKelas: string }] }
   */
  async createNextGradeClasses(request: any, reply: any) {
    try {
      const scope: DataScope = request.dataScope;
      if (!scope.tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }
      const { classes } = request.body as { classes: Array<{ sourceKelasId: string; namaKelas: string }> };
      if (!Array.isArray(classes) || classes.length === 0) {
        return reply.status(400).send({ success: false, message: 'classes array is required', data: null });
      }
      const result = await transitionService.createNextGradeClasses(scope.tenantId, classes);
      return reply.status(200).send({ success: true, message: `${result.created} kelas berhasil dibuat`, data: result });
    } catch (e: any) {
      appLogger.error({ err: e }, 'Controller error');
      console.error('TRANSITION CREATE NEXT GRADE ERROR:', e);
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }
}

export const transitionController = new TransitionController();
