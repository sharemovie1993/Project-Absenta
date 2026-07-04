import { kenaikanKelasService } from '../services/kenaikan-kelas.service';
import { kenaikanKelasSchema } from '../../services/academic-validation.schema';
import { z } from 'zod';

class KenaikanKelasController {
  async preview(request: any, reply: any) {
    try {
      const user = request.user!;
      const parsed = kenaikanKelasSchema.parse(request.body);
      const result = await kenaikanKelasService.preview(user.roleName, user.tenantId, parsed);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: e.errors.map(err => err.message).join(', '),
          errors: e.errors
        });
      }
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }

  async run(request: any, reply: any) {
    try {
      const user = request.user!;
      const parsed = kenaikanKelasSchema.parse(request.body);
      const result = await kenaikanKelasService.run(user.roleName, user.tenantId, parsed);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: e.errors.map(err => err.message).join(', '),
          errors: e.errors
        });
      }
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }
}

export const kenaikanKelasController = new KenaikanKelasController();
