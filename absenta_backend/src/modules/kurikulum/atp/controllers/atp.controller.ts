import { atpService } from '../services/atp.service';
import { prisma } from '@/utils/prisma';

export class AtpController {
  /**
   * List all ATP plans for current tenant / guru
   */
  async list(request: any, reply: any) {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { guru_id, mapel_id, tahun_pelajaran_id, semester_id, fase } = request.query || {};

      // If user is a teacher (GURU), default to their own guru record
      let filterGuruId = guru_id;
      if (!filterGuruId && user.roleName === 'GURU') {
        const guruRecord = await prisma.guru.findFirst({
          where: { user_id: user.id, tenant_id: user.tenantId }
        });
        if (guruRecord) {
          filterGuruId = guruRecord.id;
        }
      }

      const data = await atpService.getAtpList(user.tenantId, {
        guruId: filterGuruId,
        mapelId: mapel_id,
        tahunPelajaranId: tahun_pelajaran_id,
        semesterId: semester_id,
        fase
      });

      return { success: true, message: 'Daftar ATP berhasil dimuat', data };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Gagal memuat daftar ATP' };
    }
  }

  /**
   * Detail ATP by ID
   */
  async getById(request: any, reply: any) {
    try {
      const user = request.user;
      const { id } = request.params;

      const data = await atpService.getAtpById(user.tenantId, id);
      return { success: true, message: 'Detail ATP berhasil dimuat', data };
    } catch (error: any) {
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal memuat detail ATP' };
    }
  }

  /**
   * Create or update ATP & TP
   */
  async upsert(request: any, reply: any) {
    try {
      const user = request.user;
      const body = request.body || {};

      let targetGuruId = body.guru_id;
      if (!targetGuruId) {
        const guruRecord = await prisma.guru.findFirst({
          where: { user_id: user.id, tenant_id: user.tenantId }
        });
        if (guruRecord) {
          targetGuruId = guruRecord.id;
        }
      }

      if (!targetGuruId) {
        reply.status(400);
        return { success: false, message: 'Guru ID wajib ditentukan' };
      }

      const data = await atpService.upsertAtp(user.tenantId, {
        ...body,
        guru_id: targetGuruId
      });

      return { success: true, message: 'Rencana ATP berhasil disimpan', data };
    } catch (error: any) {
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal menyimpan rencana ATP' };
    }
  }

  /**
   * Delete ATP
   */
  async delete(request: any, reply: any) {
    try {
      const user = request.user;
      const { id } = request.params;

      const result = await atpService.deleteAtp(user.tenantId, id);
      return { success: true, message: result.message };
    } catch (error: any) {
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal menghapus rencana ATP' };
    }
  }

  /**
   * Quick TP Recommendation for Live KBM Session Journal
   */
  async getActiveTpForSesi(request: any, reply: any) {
    try {
      const user = request.user;
      const { sesiId } = request.params;

      const data = await atpService.getActiveTpForSesi(user.tenantId, sesiId);
      return { success: true, message: 'Daftar TP untuk sesi KBM berhasil dimuat', data };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Gagal memuat rekomendasi TP' };
    }
  }
}

export const atpController = new AtpController();
