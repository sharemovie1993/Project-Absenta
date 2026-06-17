import { kenaikanKelasService, KenaikanKelasInput } from '../services/kenaikan-kelas.service';

class KenaikanKelasController {
  async preview(request: any, reply: any) {
    try {
      const user = request.user!;
      const input = request.body as KenaikanKelasInput;
      if (!input?.tahun_sumber_id || !input?.tahun_target_id || !Array.isArray(input?.mapping)) {
        return reply.status(400).send({ success: false, message: 'Invalid payload', data: null });
      }
      const result = await kenaikanKelasService.preview(user.roleName, user.tenantId, input);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }

  async run(request: any, reply: any) {
    try {
      const user = request.user!;
      const input = request.body as KenaikanKelasInput;
      if (!input?.tahun_sumber_id || !input?.tahun_target_id || !Array.isArray(input?.mapping)) {
        return reply.status(400).send({ success: false, message: 'Invalid payload', data: null });
      }
      const result = await kenaikanKelasService.run(user.roleName, user.tenantId, input);
      return reply.status(200).send({ success: true, message: 'OK', data: result });
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e?.message || 'Bad Request', data: null });
    }
  }
}

export const kenaikanKelasController = new KenaikanKelasController();
