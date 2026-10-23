import { DknService } from '../services/dkn.service';

export class DknController {
  // ─── 1. GET MATRIKS DKN ────────────────────────────────────────────────────
  static async getMatriks(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant tidak ditemukan' });
      }

      const result = await DknService.getMatriksDkn(tenantId, request.query);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[DknController.getMatriks]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: 'Gagal mengambil matriks DKN',
        error: error.message,
      });
    }
  }

  // ─── 2. PREVIEW SURAT PENGANTAR DINAS ──────────────────────────────────────
  static async previewSuratPengantar(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant tidak ditemukan' });
      }

      const result = await DknService.previewSuratPengantar(tenantId, request.body);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[DknController.previewSuratPengantar]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: 'Gagal memuat pratinjau surat pengantar dinas',
        error: error.message,
      });
    }
  }

  // ─── 3. ISSUE SURAT PENGANTAR DINAS & SIMPAN ARSIP ─────────────────────────
  static async issueSuratPengantar(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      const userId = request.user?.id || request.user?.user_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant tidak ditemukan' });
      }

      const result = await DknService.issueSuratPengantar(tenantId, userId, request.body);
      return reply.status(201).send({
        success: true,
        message: 'Surat Pengantar DKN berhasil diterbitkan dan diarsipkan',
        data: result,
      });
    } catch (error: any) {
      console.error('[DknController.issueSuratPengantar]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: 'Gagal menerbitkan surat pengantar dinas',
        error: error.message,
      });
    }
  }

  // ─── 4. GET ARSIP DKN ──────────────────────────────────────────────────────
  static async getArsip(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant tidak ditemukan' });
      }

      const result = await DknService.getArsipDkn(tenantId, request.query);
      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[DknController.getArsip]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: 'Gagal memuat daftar arsip DKN',
        error: error.message,
      });
    }
  }
}
