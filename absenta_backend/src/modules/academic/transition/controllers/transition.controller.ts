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
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }
}

export const transitionController = new TransitionController();

