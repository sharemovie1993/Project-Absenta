// @ts-nocheck
import { gerbangService } from '../../services/gerbang.service';
import { gerbangTapSchema, faceVerifySchema, faceEnrollSchema } from '../../services/gerbang.schema';
import { buildAttendanceFeed } from '@/modules/attendance/notify/controllers/notify.controller';
import { SocketMonitor } from '@/infra/realtime/socket.monitor';
import { GerbangTapInput } from '../../types/gerbang.types';
import { JenisTap, AbsensiMode, RoleName } from '@/constants/enums';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { gerbangDb as prisma } from '../../services/repositories/gerbang.db';
import { authorizationService } from '@/modules/auth/services/authorization.service';


export const gerbangFaceController = {
  async faceVerifyTap(request: any, reply: any) {
    try {
      const parsedBody = faceVerifySchema.parse(request.body);
      const { siswa_id, arah, image_base64, embedding } = parsedBody;
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const attendanceMode = request.attendanceMode as AbsensiMode;

      let allowed = false;
      if (['SUPERADMIN', 'ADMIN'].includes(roleName)) {
        allowed = true;
      } else if (roleName === RoleName.GURU) {
        const hasScanPermission = await authorizationService.hasUserPermission(String(userId), 'attendance.scan');
        if (hasScanPermission) {
          allowed = true;
        } else {
          const now = new Date();
          const active = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: String(tenantId),
              user_id: String(userId),
              is_active: true,
              AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
              Position: { scope_type: 'attendance' },
            },
            select: { id: true },
          });
          allowed = !!active;
        }
      }
      
      if (!allowed) {
        reply.status(403);
        return { success: false, message: 'Forbidden: not active PetugasAbsensi' };
      }

      const result = await gerbangService.faceVerifyTap({ siswa_id, arah, image_base64, embedding }, userId, tenantId, attendanceMode);
      
      reply.status(200);

      if (result.success && result.data) {
        try {
          const payload = {
            tenant_id: String(tenantId),
            sesi_gerbang_id: String((result.data as any)?.sesi_gerbang_id || ''),
            siswa_id: String((result.data as any)?.siswa_id || ''),
            arah: String((result.data as any)?.arah || ''),
            waktu_tap: (result.data as any)?.waktu_tap || new Date().toISOString(),
            record_id: String((result.data as any)?.id || ''),
          };
          const redis = (await import('@/queue/redis')).getRedisConnection() as any;
          await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
          
          const io = (request.server as any).io;
          const ioApi = (request.server as any).ioApi;
          if (io) io.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
          if (ioApi) ioApi.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
        } catch (e) {
          console.error('Realtime notify error:', e);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Face identification error:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error', error: error.message };
    }
  },

  async faceEnroll(request: any, reply: any) {
    try {
      const parsedBody = faceEnrollSchema.parse(request.body);
      const { siswa_id, image_base64, source, embedding_type, model_name, embedding } = parsedBody;
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      if (roleName === RoleName.SISWA) {
        const siswaUser = await prisma.siswa.findFirst({ where: { tenant_id: String(tenantId), user_id: String(userId) }, select: { id: true } });
        if (!siswaUser) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa profile not found' };
        }
        if (String(siswa_id) !== String(siswaUser.id)) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa hanya dapat merekam wajah untuk dirinya sendiri' };
        }
      } else if (roleName === RoleName.GURU || roleName === RoleName.SISWA) {
        // Real-time capability check for face enrollment (Officer Context)
        const hasScanPermission = await authorizationService.hasUserPermission(String(userId), 'attendance.scan');
        
        if (!hasScanPermission) {
          const now = new Date();
          const active = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: String(tenantId),
              user_id: String(userId),
              is_active: true,
              AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
              Position: { scope_type: 'attendance' },
            },
            select: { id: true },
          });
          if (!active) {
            reply.status(403);
            const msg = roleName === RoleName.SISWA ? 'Forbidden: hanya Petugas Kelas yang dapat merekam wajah siswa lain' : 'Forbidden: hanya Petugas Absensi yang dapat merekam wajah siswa lain';
            return { success: false, message: msg };
          }
        }
      }
      console.log('[FACE_ENROLL_CTRL] request', { siswa_id, tenantId, userId, roleName });
      const result = await gerbangService.faceEnroll({ siswa_id, image_base64, source, embedding_type, model_name, embedding }, userId, tenantId);
      if (!result.success) {
        console.error('[FACE_ENROLL_CTRL] failed', { result });
        reply.status(400);
        return result;
      }
      console.log('[FACE_ENROLL_CTRL] success', { result });
      reply.status(200);
      return result;
    } catch (error) {
      console.error('[FACE_ENROLL_CTRL] error', { error });
      reply.status(500);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return { success: false, message: msg };
    }
  },
  
  async getFaceTemplates(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const { search = '', kelas_id, limit = 50, offset = 0 } = request.query || {};
      if (!tenantId && roleName !== 'SUPERADMIN') {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      const where: any = {};
      if (roleName !== 'SUPERADMIN') where.tenant_id = tenantId;
      if (roleName === RoleName.SISWA) {
        const siswaUser = await prisma.siswa.findFirst({ where: { tenant_id: String(tenantId), user_id: String(request.user?.id || '') }, select: { id: true } });
        if (!siswaUser) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa profile not found' };
        }
        where.siswa_id = String(siswaUser.id);
      }
      if (search) {
        where.OR = [
          { siswa_id: search },
          { Siswa: { nama_siswa: { contains: search, mode: 'insensitive' } } },
          { Siswa: { nis: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (kelas_id) {
        where.Siswa = { ...(where.Siswa || {}), kelas_id };
      }
      const [rows, total] = await Promise.all([
        prisma.siswaFaceTemplate.findMany({
          where,
          include: { Siswa: { select: { id: true, nama_siswa: true, nis: true, Kelas: { select: { nama_kelas: true } } } } },
          orderBy: { created_at: 'desc' },
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
        }),
        prisma.siswaFaceTemplate.count({ where }),
      ]);
      return {
        success: true,
        message: 'OK',
        data: rows,
        pagination: { total, limit: parseInt(String(limit)), offset: parseInt(String(offset)) },
      };
    } catch (error) {
      reply.status(500);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return { success: false, message: msg };
    }
  },
  async getEmbeddingHealth(_request: any, reply: any) {
    try {
      const result = await gerbangService.embeddingProviderHealth();
      reply.status(result.success ? 200 : 502);
      return result;
    } catch (error) {
      reply.status(500);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return { success: false, message: msg };
    }
  },

  async deleteFaceTemplate(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const userId = request.user?.id;
      const { id } = request.params as { id: string };
      if (!id) {
        reply.status(400);
        return { success: false, message: 'Template ID wajib diisi' };
      }
      if (!tenantId && roleName !== RoleName.SUPERADMIN) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      const tpl = await prisma.siswaFaceTemplate.findFirst({ where: { id: String(id) }, select: { id: true, tenant_id: true, siswa_id: true } });
      if (!tpl) {
        reply.status(404);
        return { success: false, message: 'Template tidak ditemukan' };
      }
      if (roleName !== RoleName.SUPERADMIN && String(tpl.tenant_id) !== String(tenantId)) {
        reply.status(403);
        return { success: false, message: 'Forbidden: tenant mismatch' };
      }
      if (roleName === RoleName.SISWA) {
        const siswaUser = await prisma.siswa.findFirst({ where: { tenant_id: String(tenantId), user_id: String(userId) }, select: { id: true } });
        if (!siswaUser) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa profile not found' };
        }
        if (String(tpl.siswa_id) !== String(siswaUser.id)) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa hanya dapat menghapus template miliknya' };
        }
      }
      await prisma.siswaFaceTemplate.delete({ where: { id: String(id) } });
      return { success: true, message: 'Template berhasil dihapus' };
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },
};
