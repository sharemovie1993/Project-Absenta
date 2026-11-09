import { CbtSettingsService } from '../services/cbt-settings.service';
import { sendResponse, sendError } from '../../../utils/response';

export class CbtSettingsController {
  static async getEventsSummary(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await CbtSettingsService.getEventsSummary(tenant_id);
      return sendResponse(reply, 200, true, 'Ringkasan konfigurasi event CBT berhasil diambil', result);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal mengambil konfigurasi event CBT', error);
    }
  }

  static async upsertEvent(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await CbtSettingsService.upsertEvent(tenant_id, req.body || {});
      return sendResponse(reply, 200, true, 'Event CBT berhasil disimpan', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menyimpan event CBT', error);
    }
  }

  static async setActiveEvent(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { event_id } = req.body || {};
      if (!event_id) {
        return sendError(reply, 400, 'Parameter event_id wajib dilampirkan');
      }
      const result = await CbtSettingsService.setActiveEvent(tenant_id, event_id);
      return sendResponse(reply, 200, true, 'Event aktif CBT berhasil diperbarui', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal mengaktifkan event CBT', error);
    }
  }

  static async deleteEvent(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtSettingsService.deleteEvent(tenant_id, id);
      return sendResponse(reply, 200, true, 'Event CBT berhasil dihapus', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menghapus event CBT', error);
    }
  }
}
