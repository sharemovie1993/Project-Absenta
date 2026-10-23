import { MutasiService } from '../services/mutasi.service';

export class MutasiController {
  /**
   * POST /correspondence/mutasi/preview-keluar
   */
  static async previewKeluar(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const data = await MutasiService.previewKeluar(tenantId, request.body);
      return reply.send({ success: true, data });
    } catch (error: any) {
      console.error('[MutasiController.previewKeluar]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menghasilkan pratinjau surat mutasi keluar',
      });
    }
  }

  /**
   * POST /correspondence/mutasi/issue-keluar
   */
  static async issueKeluar(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const userId = request.user?.id || request.user?.user_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await MutasiService.issueKeluar(tenantId, userId, request.body);
      return reply.status(201).send({
        success: true,
        message: 'Surat mutasi keluar berhasil diterbitkan dan status siswa diperbarui',
        data: result,
      });
    } catch (error: any) {
      console.error('[MutasiController.issueKeluar]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menerbitkan surat mutasi keluar',
      });
    }
  }

  /**
   * POST /correspondence/mutasi/preview-masuk
   */
  static async previewMasuk(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const data = await MutasiService.previewMasuk(tenantId, request.body);
      return reply.send({ success: true, data });
    } catch (error: any) {
      console.error('[MutasiController.previewMasuk]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menghasilkan pratinjau surat mutasi masuk',
      });
    }
  }

  /**
   * POST /correspondence/mutasi/issue-masuk
   */
  static async issueMasuk(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const userId = request.user?.id || request.user?.user_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await MutasiService.issueMasuk(tenantId, userId, request.body);
      return reply.status(201).send({
        success: true,
        message: 'Surat keterangan diterima berhasil diterbitkan',
        data: result,
      });
    } catch (error: any) {
      console.error('[MutasiController.issueMasuk]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menerbitkan surat mutasi masuk',
      });
    }
  }

  /**
   * GET /correspondence/mutasi/buku-register
   */
  static async getBukuRegister(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await MutasiService.getBukuRegister(tenantId, request.query);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      console.error('[MutasiController.getBukuRegister]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mengambil buku register mutasi siswa',
      });
    }
  }

  /**
   * GET /correspondence/mutasi/agenda
   */
  static async getAgenda(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: Tenant tidak ditemukan',
        });
      }

      const result = await MutasiService.getAgendaMutasi(tenantId, request.query);
      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[MutasiController.getAgenda]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mengambil agenda surat mutasi',
      });
    }
  }
}
