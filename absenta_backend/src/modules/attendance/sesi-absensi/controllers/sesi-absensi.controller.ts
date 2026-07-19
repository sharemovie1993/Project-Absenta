import { sesiService } from '../services/sesi.service';
import { createSesiAbsensiSchema, updateSesiAbsensiSchema, updateSesiStatusSchema, updateAbsenGuruSchema, tapSiswaSchema } from '../services/sesi-absensi.schema';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { getTenantLocalTime, generateSessionsForTenant } from '@/jobs/attendanceAutoSession.job';

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
      if (error.message.includes('Forbidden')) {
        reply.status(403);
      } else if (error.message.includes('Sesi sudah ada')) {
        reply.status(409);
      } else if (error.message.includes('required') || error.message.includes('tidak valid') || error.message.includes('tumpang tindih')) {
        reply.status(400);
        if (error.message.includes('tumpang tindih')) reply.status(409);
      } else {
        reply.status(500);
      }
      return { success: false, message: error.message || 'Internal server error' };
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

      const data = await sesiService.list(tenantId, scope, query);
      
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
};
