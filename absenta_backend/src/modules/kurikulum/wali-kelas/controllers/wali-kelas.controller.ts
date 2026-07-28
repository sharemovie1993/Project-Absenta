import {
  waliKelasService,
} from '../services/wali-kelas.service';
import { assignWaliKelasStrukturSchema } from '../../../../modules/academic/services/academic-validation.schema';
import { z } from 'zod';

export const waliKelasController = {

  async getStrukturAssignments(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 10;
      const search = request.query.search as string;
      let guru_id = request.query.guru_id as string | undefined;
      const kelas_id = request.query.kelas_id as string | undefined;
      const include_inactive =
        request.query.include_inactive === 'true' || request.query.include_inactive === true;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const user = request.user;
      guru_id = await waliKelasService.resolveGuruIdForStrukturAssignments(tenantId, scope, user, guru_id);

      const result = await waliKelasService.getStrukturAssignments(tenantId, scope, {
        page,
        limit,
        search,
        guru_id,
        kelas_id,
        include_inactive,
      });

      return reply.status(200).send({
        success: true,
        message: 'OK',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  async assignStrukturWaliKelas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const parsed = assignWaliKelasStrukturSchema.parse(request.body);

      const data = await waliKelasService.assignStrukturWaliKelas(tenantId, parsed);
      return reply.status(200).send({ success: true, message: 'OK', data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('already assigned') ||
          error.message.includes('Tenant ID is required')
        ) {
          return reply.status(400).send({ success: false, message: error.message, data: null });
        }
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  async nonaktifStrukturAssignment(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      await waliKelasService.nonaktifStrukturAssignment(tenantId, id);
      return reply.status(200).send({ success: true, message: 'OK', data: null });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Tenant ID is required')) {
          return reply.status(400).send({ success: false, message: error.message, data: null });
        }
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  async bySiswa(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const siswaId = request.params.siswaId as string;
      const tahun_pelajaran_id = request.query.tahun_pelajaran_id as string | undefined;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const data = await waliKelasService.getBySiswa(tenantId, siswaId, tahun_pelajaran_id);
      if (!data) {
        return reply.status(404).send({ success: false, message: 'Not found', data: null });
      }
      return reply.status(200).send({ success: true, message: 'OK', data });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  // ── SK Wali Kelas Arsip ──────────────────────────────────────────────────

  async saveSkArsip(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id || 'system';
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      const data = await waliKelasService.saveSkArsip(tenantId, userId, request.body);
      return reply.status(200).send({ success: true, message: 'SK berhasil diarsipkan', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Internal server error' });
    }
  },

  async getSkArsipList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      const { tahun_pelajaran, guru_id, search } = request.query || {};
      const data = await waliKelasService.getSkArsipList(tenantId, { tahun_pelajaran, guru_id, search });
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Internal server error' });
    }
  },

  async getSkArsipById(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      const data = await waliKelasService.getSkArsipById(tenantId, id);
      if (!data) {
        return reply.status(404).send({ success: false, message: 'Arsip SK tidak ditemukan' });
      }
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Internal server error' });
    }
  },

  async deleteSkArsip(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      await waliKelasService.deleteSkArsip(tenantId, id);
      return reply.status(200).send({ success: true, message: 'Arsip SK berhasil dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Internal server error' });
    }
  },
};

