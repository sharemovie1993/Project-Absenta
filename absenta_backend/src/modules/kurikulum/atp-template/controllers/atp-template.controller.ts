import { appLogger } from '@/utils/app-logger';
﻿import { atpTemplateService } from '../services/atp-template.service';
import { prisma } from '@/utils/prisma';

export class AtpTemplateController {
  /**
   * List templates — guru hanya lihat PUBLISHED, SUPERADMIN lihat semua
   */
  async list(request: any, reply: any) {
    try {
      const user = request.user;
      const { fase, kode_mapel_ref, search } = request.query || {};
      const isSuperAdmin = user?.roleName === 'SUPERADMIN';

      const data = await atpTemplateService.listTemplates({
        fase,
        kode_mapel_ref,
        search,
        includeDraft: isSuperAdmin
      });

      return { success: true, message: 'Daftar template ATP berhasil dimuat', data };
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      reply.status(500);
      return { success: false, message: error.message || 'Gagal memuat template ATP' };
    }
  }

  /**
   * Detail template by ID
   */
  async getById(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await atpTemplateService.getTemplateById(id);
      return { success: true, message: 'Detail template ATP berhasil dimuat', data };
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal memuat detail template ATP' };
    }
  }

  /**
   * Buat atau update template (SUPERADMIN only)
   */
  async upsert(request: any, reply: any) {
    try {
      const user = request.user;
      const body = request.body || {};

      const data = await atpTemplateService.upsertTemplate({
        ...body,
        created_by: body.created_by || user?.id
      });

      return { success: true, message: 'Template ATP berhasil disimpan', data };
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal menyimpan template ATP' };
    }
  }

  /**
   * Publish atau unpublish template (SUPERADMIN only)
   */
  async setStatus(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { status } = request.body || {};

      if (!['DRAFT', 'PUBLISHED'].includes(status)) {
        reply.status(400);
        return { success: false, message: 'Status tidak valid. Gunakan DRAFT atau PUBLISHED' };
      }

      const data = await atpTemplateService.setStatus(id, status);
      return {
        success: true,
        message: `Template berhasil ${status === 'PUBLISHED' ? 'dipublikasikan' : 'dikembalikan ke DRAFT'}`,
        data
      };
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal mengubah status template' };
    }
  }

  /**
   * Hapus template (SUPERADMIN only)
   */
  async delete(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await atpTemplateService.deleteTemplate(id);
      return { success: true, message: result.message };
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal menghapus template ATP' };
    }
  }

  /**
   * Import template → clone ke ATP personal guru
   */
  async importTemplate(request: any, reply: any) {
    try {
      const user = request.user;
      const { id: templateId } = request.params;
      const body = request.body || {};

      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      // Resolusi guru_id: dari body atau dari data guru user saat ini
      let targetGuruId = body.guru_id;
      if (!targetGuruId && user.roleName === 'GURU') {
        const guruRecord = await prisma.guru.findFirst({
          where: { user_id: user.id, tenant_id: user.tenantId }
        });
        if (guruRecord) targetGuruId = guruRecord.id;
      }

      if (!targetGuruId) {
        reply.status(400);
        return { success: false, message: 'Guru ID wajib ditentukan' };
      }

      if (!body.mapel_id || !body.tahun_pelajaran_id || !body.semester_id) {
        reply.status(400);
        return { success: false, message: 'mapel_id, tahun_pelajaran_id, dan semester_id wajib diisi' };
      }

      const data = await atpTemplateService.importTemplateToAtp(
        user.tenantId,
        templateId,
        { ...body, guru_id: targetGuruId }
      );

      return {
        success: true,
        message: 'Template ATP berhasil diimpor ke rencana ATP Anda',
        data
      };
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal mengimpor template ATP' };
    }
  }
}

export const atpTemplateController = new AtpTemplateController();
