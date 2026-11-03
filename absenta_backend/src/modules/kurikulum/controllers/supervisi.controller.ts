import { SupervisiService } from '../services/supervisi.service';
import { sendResponse, sendError } from '../../../utils/response';
import { supervisiGuruCreateSchema, supervisiGuruUpdateSchema, supervisiSelfAssessmentSchema } from '../services/kurikulum.schema';
import { z } from 'zod';
import { prisma } from '@/utils/prisma';
import { authorizationService } from '@/modules/auth/services/authorization.service';

export class SupervisiController {
  static async create(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = supervisiGuruCreateSchema.parse(req.body);
      const result = await SupervisiService.create(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Data supervisi created', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return sendError(reply, 500, 'Failed to create supervisi data', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = supervisiGuruUpdateSchema.parse(req.body);
      const result = await SupervisiService.update(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Data supervisi updated', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return sendError(reply, 500, 'Failed to update supervisi data', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SupervisiService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Data supervisi deleted', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to delete supervisi data', error);
    }
  }

  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const query = { ...req.query };

      // 🛡️ Guru Data Isolation: Jika pengguna adalah GURU/WALIKELAS biasa (bukan admin/superadmin & tidak memegang capability supervisi kurikulum),
      // maka batasi query hanya untuk guru_id milik dirinya sendiri.
      const rawRole = req.user.roleName || req.user.Role?.name || (typeof req.user.role === 'string' ? req.user.role : req.user.role?.name);
      const roleName = String(rawRole || '').trim().toUpperCase();

      const isPrivileged = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
      if (!isPrivileged) {
        const authCheck = await authorizationService.isUserAuthorized(String(userId), ['curriculum.supervision.manage', 'curriculum.supervision.view.schedule'], { user: req.user });
        if (!authCheck.allowed) {
          const guruProfile = await prisma.guru.findFirst({
            where: { user_id: userId, tenant_id },
            select: { id: true },
          });
          if (guruProfile) {
            query.guru_id = guruProfile.id;
          }
        }
      }

      const result = await SupervisiService.getAll(tenant_id, query);
      return sendResponse(reply, 200, true, 'Data supervisi retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve supervisi data', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await SupervisiService.getById(tenant_id, id);
      if (!result) {
        return sendError(reply, 404, 'Supervisi not found');
      }

      // Pastikan guru biasa hanya bisa melihat supervisi miliknya sendiri
      const rawRole = req.user.roleName || req.user.Role?.name || (typeof req.user.role === 'string' ? req.user.role : req.user.role?.name);
      const roleName = String(rawRole || '').trim().toUpperCase();
      const isPrivileged = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
      if (!isPrivileged) {
        const authCheck = await authorizationService.isUserAuthorized(String(userId), ['curriculum.supervision.view.report', 'curriculum.supervision.manage'], { user: req.user });
        if (!authCheck.allowed) {
          const guruProfile = await prisma.guru.findFirst({
            where: { user_id: userId, tenant_id },
            select: { id: true },
          });
          if (!guruProfile || result.guru_id !== guruProfile.id) {
            return sendError(reply, 403, 'Forbidden: Anda hanya dapat melihat supervisi milik sendiri');
          }
        }
      }

      return sendResponse(reply, 200, true, 'Data supervisi retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve supervisi data', error);
    }
  }

  static async submitSelfAssessment(req: any, reply: any) {
    try {
      const { tenant_id, id: guruUserId } = req.user!;
      const { id } = req.params;
      const parsed = supervisiSelfAssessmentSchema.parse(req.body);

      const result = await SupervisiService.submitSelfAssessment(tenant_id, id, guruUserId, parsed);
      return sendResponse(reply, 200, true, 'Evaluasi diri berhasil disimpan', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return sendError(reply, error.message.includes('not found') || error.message.includes('Hanya') ? 400 : 500, error.message || 'Gagal menyimpan evaluasi diri', error);
    }
  }

  static async getAnalytics(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await SupervisiService.getAnalytics(tenant_id);
      return sendResponse(reply, 200, true, 'Data analitik supervisi retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve supervisi analytics', error);
    }
  }

  static async getRecommendations(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { guru_id, tanggal } = req.query;

      if (!guru_id || !tanggal) {
        return reply.status(400).send({
          success: false,
          message: 'guru_id and tanggal query parameters are required'
        });
      }

      const result = await SupervisiService.getSchedulingRecommendations(tenant_id, guru_id, tanggal);
      return sendResponse(reply, 200, true, 'Rekomendasi jadwal supervisi retrieved', result);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Failed to retrieve scheduling recommendations', error);
    }
  }

  static async getProgress(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await SupervisiService.getProgress(tenant_id);
      return sendResponse(reply, 200, true, 'Progress supervisi retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve supervisi progress', error);
    }
  }
}
