import { SuratKeteranganService } from '../services/surat-keterangan.service';

export class SuratKeteranganController {
  /**
   * POST /correspondence/surat-keterangan/preview
   */
  static async preview(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const previewData = await SuratKeteranganService.preview(tenantId, request.body);

      return reply.send({
        success: true,
        data: previewData,
      });
    } catch (error: any) {
      console.error('[SuratKeteranganController.preview]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menghasilkan pratinjau surat keterangan',
      });
    }
  }

  /**
   * POST /correspondence/surat-keterangan/issue
   */
  static async issue(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const userId = request.user?.id || request.user?.user_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const issuedSurat = await SuratKeteranganService.issue(tenantId, userId, request.body);

      return reply.status(201).send({
        success: true,
        message: 'Surat keterangan berhasil diterbitkan dan dicatat di agenda keluar',
        data: issuedSurat,
      });
    } catch (error: any) {
      console.error('[SuratKeteranganController.issue]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menerbitkan surat keterangan',
      });
    }
  }

  /**
   * GET /correspondence/surat-keterangan/history
   */
  static async getHistory(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const historyData = await SuratKeteranganService.getHistory(tenantId, request.query || {});

      return reply.send({
        success: true,
        data: historyData.list,
        pagination: historyData.pagination,
      });
    } catch (error: any) {
      console.error('[SuratKeteranganController.getHistory]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat riwayat surat keterangan',
      });
    }
  }
}
