import { kejadianKhususService } from '../services/kejadian-khusus.service';

export class KejadianKhususController {
  async getAll(request: any, reply: any) {
    try {
      const result = await kejadianKhususService.getAll(request.dataScope);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async create(request: any, reply: any) {
    try {
      const result = await kejadianKhususService.create(request.dataScope, request.body);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async delete(request: any, reply: any) {
    try {
      const { id } = request.params;
      await kejadianKhususService.delete(request.dataScope, id);
      return reply.send({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

export const kejadianKhususController = new KejadianKhususController();
