import { WhatsappService } from '../services/whatsapp.service';

const whatsappService = new WhatsappService();

export class WhatsappController {
  async getConfig(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    try {
      const config = await whatsappService.getConfig(tenant_id);
      return reply.send({ success: true, data: config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async saveConfig(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const body = request.body as any;
    try {
      const config = await whatsappService.saveConfig(tenant_id, body);
      return reply.send({ success: true, message: 'Konfigurasi berhasil disimpan', data: config });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async testConnection(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const { test_number } = request.body as any;
    
    if (!test_number) {
      return reply.status(400).send({ success: false, message: 'Nomor tes wajib diisi' });
    }

    try {
      const result = await whatsappService.testConnection(tenant_id, test_number);
      return reply.send({ success: true, message: 'Pesan tes berhasil dikirim', data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
