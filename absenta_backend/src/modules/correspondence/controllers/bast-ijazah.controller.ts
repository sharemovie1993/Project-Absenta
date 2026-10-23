import { BastIjazahService } from '../services/bast-ijazah.service';

export class BastIjazahController {
  /**
   * GET /correspondence/clearance-bast/status/:siswaId
   */
  static async getStatusClearance(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const { siswaId } = request.params;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await BastIjazahService.getStatusClearance(tenantId, siswaId);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      console.error('[BastIjazahController.getStatusClearance]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mengambil status clearance siswa',
      });
    }
  }

  /**
   * POST /correspondence/clearance-bast/update-clearance
   */
  static async updateClearance(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const userId = request.user?.id || request.user?.user_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await BastIjazahService.updateClearance(tenantId, userId, request.body);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      console.error('[BastIjazahController.updateClearance]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memperbarui status pos clearance',
      });
    }
  }

  /**
   * POST /correspondence/clearance-bast/preview-bebas-administrasi
   */
  static async previewBebasAdministrasi(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await BastIjazahService.previewBebasAdministrasi(tenantId, request.body);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      console.error('[BastIjazahController.previewBebasAdministrasi]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menyusun pratinjau surat bebas administrasi',
      });
    }
  }

  /**
   * POST /correspondence/clearance-bast/preview-bast
   */
  static async previewBast(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await BastIjazahService.previewBast(tenantId, request.body);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      console.error('[BastIjazahController.previewBast]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menyusun pratinjau BAST ijazah',
      });
    }
  }

  /**
   * POST /correspondence/clearance-bast/issue-bast
   */
  static async issueBast(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const userId = request.user?.id || request.user?.user_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await BastIjazahService.issueBast(tenantId, userId, request.body);
      return reply.status(201).send({
        success: true,
        message: 'Berita Acara Serah Terima Ijazah berhasil diterbitkan dan dicatat di agenda keluar',
        data: result,
      });
    } catch (error: any) {
      console.error('[BastIjazahController.issueBast]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menerbitkan BAST ijazah',
      });
    }
  }

  /**
   * GET /correspondence/clearance-bast/buku-ekspedisi
   */
  static async getBukuEkspedisi(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await BastIjazahService.getBukuEkspedisi(tenantId, request.query);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      console.error('[BastIjazahController.getBukuEkspedisi]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mengambil buku ekspedisi ijazah',
      });
    }
  }
}
