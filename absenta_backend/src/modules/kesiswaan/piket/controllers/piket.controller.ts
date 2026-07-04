import { PiketService } from '../services/piket.service';
import { createIzinSchema } from '../../services/kesiswaan-validation.schema';
import { z } from 'zod';

export class PiketController {
  private piketService: PiketService;

  constructor() {
    this.piketService = new PiketService();
  }

  async createIzin(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const parsed = createIzinSchema.parse(request.body);
      const data = await this.piketService.createIzin(tenantId, parsed);
      reply.status(201).send({ success: true, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      reply.status(500).send({ success: false, message: error.message });
    }
  }

  async catatKembali(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { id } = request.params;
      const data = await this.piketService.catatKembali(tenantId, id);
      reply.send({ success: true, data });
    } catch (error: any) {
      reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getIzinHarian(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { date, startDate, endDate } = request.query;
      
      let data;
      if (startDate && endDate) {
        data = await this.piketService.getIzinRange(tenantId, startDate, endDate);
      } else {
        data = await this.piketService.getIzinHarian(tenantId, new Date(date || new Date()));
      }
      reply.send({ success: true, data });
    } catch (error: any) {
      reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteIzin(request: any, reply: any) {
    try {
      const tenantId = (request as any).tenantId;
      const { id } = request.params;
      await this.piketService.deleteIzin(tenantId, id);
      reply.send({ success: true, message: 'Izin deleted' });
    } catch (error: any) {
      reply.status(500).send({ success: false, message: error.message });
    }
  }
}
