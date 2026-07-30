import { WaChatLogService } from '../services/wa-chat-log.service';

export class WaChatLogController {
  /**
   * GET /whatsapp/chat-logs
   * Daftar kontak unik yang pernah berinteraksi dengan chatbot.
   */
  async listContacts(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const { search = '', page = '1', limit = '30' } = request.query as any;

    try {
      const result = await WaChatLogService.listContacts(tenant_id, {
        search,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * GET /whatsapp/chat-logs/:phone
   * Riwayat percakapan detail per nomor HP.
   */
  async getChatDetail(request: any, reply: any) {
    const { tenant_id } = request.user as any;
    const { phone } = request.params as any;
    const { page = '1', limit = '50' } = request.query as any;

    if (!phone) {
      return reply.status(400).send({ success: false, message: 'Parameter phone wajib diisi' });
    }

    try {
      const result = await WaChatLogService.getChatDetail(tenant_id, phone, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

export const waChatLogController = new WaChatLogController();
