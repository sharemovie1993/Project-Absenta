import { prisma } from '@/utils/prisma';
import { sesiService } from '../services/sesi.service';
import { createSesiAbsensiSchema, updateSesiAbsensiSchema, updateSesiStatusSchema, updateAbsenGuruSchema, tapSiswaSchema } from '../services/sesi-absensi.schema';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { getTenantLocalTime, generateSessionsForTenant } from '@/jobs/attendanceAutoSession.job';
import { sesiReminderService } from '../services/sesi-reminder.service';
import { TeacherLocatorService } from '../services/teacher-locator.service';

export const sesiAbsensiController = {
  async create(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const parsedBody = createSesiAbsensiSchema.parse(request.body || {});
      const payload = parsedBody;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      if (!userId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: user_id not found' };
      }

      const created = await sesiService.create(tenantId, scope, payload, userId);
      
      reply.status(201);
      return { success: true, message: 'Sesi absensi created', data: created };
    } catch (error: any) {
      console.error('Create sesi absensi error:', error);
      let readableMsg = error.message || 'Internal server error';

      if (error?.name === 'ZodError' || error?.issues) {
        const issues = error?.issues || [];
        readableMsg = 'Validasi input tidak valid: ' + (issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'sintaks data salah');
        reply.status(400);
        return { success: false, message: readableMsg };
      }

      if (typeof error.message === 'string' && error.message.startsWith('[')) {
        try {
          const parsed = JSON.parse(error.message);
          if (Array.isArray(parsed) && parsed.length > 0) {
            readableMsg = 'Validasi data tidak valid: ' + (parsed[0].message || parsed[0].code || 'Format salah');
          }
        } catch (_) {}
      }

      if (readableMsg.includes('Forbidden')) {
        reply.status(403);
      } else if (readableMsg.includes('Sesi sudah ada')) {
        reply.status(409);
      } else if (readableMsg.includes('required') || readableMsg.includes('tidak valid') || readableMsg.includes('tumpang tindih')) {
        reply.status(400);
        if (readableMsg.includes('tumpang tindih')) reply.status(409);
      } else {
        reply.status(400);
      }
      return { success: false, message: readableMsg };
    }
  },

  async list(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const query = request.query || {};

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const queryWithUser = { ...query, currentUserId: request.user?.id };
      const data = await sesiService.list(tenantId, scope, queryWithUser);
      
      reply.status(200);
      return { success: true, message: 'List sesi absensi', data };
    } catch (error: any) {
      console.error('List sesi error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async updateStatus(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;
      const parsedBody = updateSesiStatusSchema.parse(request.body || {});
      const { status } = parsedBody;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const updated = await sesiService.updateStatus(tenantId, scope, id, status);
      
      reply.status(200);
      return { success: true, message: 'Sesi status updated', data: updated };
    } catch (error: any) {
      console.error('Update status error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async update(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;
      const parsedBody = updateSesiAbsensiSchema.parse(request.body || {});
      const data = parsedBody;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const updated = await sesiService.update(tenantId, scope, id, data);
      
      reply.status(200);
      return { success: true, message: 'Sesi updated', data: updated };
    } catch (error: any) {
      console.error('Update sesi error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async remove(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const result = await sesiService.remove(tenantId, scope, id, userId);
      
      reply.status(200);
      return { success: true, message: 'Sesi absensi deleted', data: result };
    } catch (error: any) {
      console.error('Delete sesi error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async updateAbsenGuru(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id, guru_id } = request.params;
      const parsedBody = updateAbsenGuruSchema.parse(request.body || {});
      const data = parsedBody;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const updated = await sesiService.updateAbsenGuru(tenantId, scope, id, guru_id, data);
      
      // 📡 Real-time Broadcast: Notify all connected clients across the school
      try {
        const { getRedisConnection } = await import('@/queue/redis');
        const redis = getRedisConnection();
        const eventPayload = {
          tenant_id: tenantId,
          sesi_id: id,
          guru_id,
          status: data.status,
          catatan: data.catatan,
          updated_at: new Date().toISOString()
        };
        await redis.publish('events:absen_guru_update', JSON.stringify(eventPayload));
        await redis.publish('events:sesi_status_update', JSON.stringify(eventPayload));
        await redis.publish('events:session_attendance_update', JSON.stringify(eventPayload));
      } catch (wsErr) {
        console.warn('[updateAbsenGuru] WebSocket broadcast warning:', wsErr);
      }

      reply.status(200);
      return { success: true, message: 'Absen guru tersimpan', data: updated };
    } catch (error: any) {
      console.error('Update absen guru error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async tapSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const { id: sesi_id } = request.params;
      const parsedBody = tapSiswaSchema.parse(request.body || {});
      const data = parsedBody;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const updated = await sesiService.tapSiswa(tenantId, scope, sesi_id, data, userId);
      
      reply.status(200);
      return { success: true, message: 'Absen siswa tersimpan', data: updated };
    } catch (error: any) {
      console.error('Tap siswa error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else if (error.message.includes('Sudah terekam')) {
        reply.status(409);
      }
      else if (
        error.message.includes('Gate') || 
        error.message.includes('Gerbang') || 
        error.message.includes('teridentifikasi') ||
        error.message.includes('akademik') || 
        error.message.includes('status')
      ) {
        reply.status(400);
      }
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async getPresensiTerpaduSesi(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id: sesi_id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const data = await sesiService.listAbsenSiswa(tenantId, scope, sesi_id, String(request.user?.id || ''));
      
      reply.status(200);
      return { success: true, message: 'Daftar presensi terpadu guru dan siswa', data };
    } catch (error: any) {
      console.error('Presensi terpadu error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async listAbsenSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id: sesi_id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const data = await sesiService.listAbsenSiswa(tenantId, scope, sesi_id, String(request.user?.id || ''));
      
      reply.status(200);
      return { success: true, message: 'Daftar absen siswa', data };
    } catch (error: any) {
      console.error('List absen siswa error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async summaryById(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const data = await sesiService.summaryById(tenantId, scope, id);
      
      reply.status(200);
      return { success: true, message: 'Ringkasan sesi', data };
    } catch (error: any) {
      console.error('Summary sesi error:', error);
      if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async checkPetugasActive(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const userId = request.user?.id;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      
      const data = await sesiService.checkPetugasActive(userId, tenantId, scope);
      
      reply.status(200);
      return { success: true, message: 'Petugas status', data };
    } catch (error: any) {
      console.error('Check petugas error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async upsertProgresMateri(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;
      const data = request.body || {};

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const upserted = await sesiService.upsertProgresMateri(tenantId, scope, id, data);
      
      reply.status(200);
      return { success: true, message: 'Progres materi tersimpan', data: upserted };
    } catch (error: any) {
      console.error('Upsert progres materi error:', error);
      if (error.message.includes('Forbidden')) reply.status(403);
      else if (error.message.includes('tidak ditemukan')) reply.status(404);
      else reply.status(500);
      return { success: false, message: error.message || 'Internal server error' };
    }
  },

  async generateFromTemplate(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const cfg = await systemConfigService.getActive(tenantId);
      const { dateStr, timeZone } = getTenantLocalTime(cfg?.timezone, new Date());

      // Trigger automatic generation logic for this specific tenant and today
      const result = await generateSessionsForTenant(tenantId, dateStr, timeZone);

      if (!result.success) {
        reply.status(400);
        return { 
          success: false, 
          message: result.message,
          data: result
        };
      }

      reply.status(200);
      return { 
        success: true, 
        message: result.message,
        data: result
      };
    } catch (error: any) {
      console.error('Generate from template error:', error);
      reply.status(500);
      return { 
        success: false, 
        message: 'Gagal memproses pembuatan sesi otomatis: ' + (error.message || 'Internal Server Error')
      };
    }
  },

  async sendReminder(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id: sesiId } = request.params;
      const body = request.body || {};

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const method = body.method === 'PERSONAL_LINK' ? 'PERSONAL_LINK' : 'GATEWAY';
      
      let effectiveSenderRole = body.senderRole;
      if (!effectiveSenderRole && request.user?.id) {
        const assign = await prisma.organizationalAssignment.findFirst({
          where: {
            user_id: request.user.id,
            tenant_id: tenantId,
            is_active: true,
            OR: [
              { end_date: null },
              { end_date: { gte: new Date() } }
            ]
          },
          include: { Position: true }
        });
        if (assign?.Position?.code) {
          effectiveSenderRole = assign.Position.code;
        }
      }
      if (!effectiveSenderRole) {
        effectiveSenderRole = request.user?.role || 'KURIKULUM';
      }

      const senderName = body.senderName || request.user?.nama || request.user?.name || undefined;

      const result = await sesiReminderService.sendReminder(tenantId, sesiId, {
        method,
        senderRole: effectiveSenderRole,
        senderName
      });

      reply.status(200);
      return result;
    } catch (error: any) {
      console.error('[sendReminder] error:', error);
      const isCooldown = error.message?.includes('Pengingat baru saja dikirim') || error.message?.includes('menit');
      reply.status(isCooldown ? 429 : 400);
      return {
        success: false,
        message: error.message || 'Gagal mengirim pengingat WhatsApp'
      };
    }
  },

  async locateTeachers(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userRole = request.user?.role || 'SISWA';
      const { q, tanggal } = request.query || {};

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const data = await TeacherLocatorService.getInstance().locateTeachers(tenantId, userRole, {
        query: q,
        tanggal
      });

      reply.status(200);
      return { success: true, data };
    } catch (error: any) {
      console.error('[locateTeachers] error:', error);
      reply.status(500);
      return {
        success: false,
        message: error.message || 'Gagal mencari posisi guru'
      };
    }
  },
};
