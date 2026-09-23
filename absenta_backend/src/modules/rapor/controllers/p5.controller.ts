import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '../../../utils/response';
import { P5Service } from '../services/p5.service';
import {
  p5ProjekCreateSchema,
  p5ProjekUpdateSchema,
  p5NilaiSiswaUpsertSchema,
  bulkP5NilaiSiswaSchema,
} from '../services/p5.schema';
import { z } from 'zod';

export class P5Controller {
  // === PROJEK ===
  static async createProjek(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = p5ProjekCreateSchema.parse(req.body);

      const result = await P5Service.createProjek(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Projek P5 berhasil dibuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal membuat projek P5', error);
    }
  }

  static async updateProjek(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = p5ProjekUpdateSchema.parse(req.body);

      const result = await P5Service.updateProjek(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Projek P5 berhasil diperbarui', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal memperbarui projek P5', error);
    }
  }

  static async getProjek(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { tahun_pelajaran_id, semester_id } = req.query;

      const result = await P5Service.getProjek(tenant_id, {
        tahun_pelajaran_id,
        semester_id,
      });

      return sendResponse(reply, 200, true, 'Daftar projek P5 berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat daftar projek P5', error);
    }
  }

  static async deleteProjek(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const result = await P5Service.deleteProjek(tenant_id, id);
      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          message: 'Projek P5 tidak ditemukan atau bukan milik tenant Anda',
        });
      }

      return sendResponse(reply, 200, true, 'Projek P5 berhasil dihapus');
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal menghapus projek P5', error);
    }
  }

  // === NILAI ===
  static async upsertNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = p5NilaiSiswaUpsertSchema.parse(req.body);

      const result = await P5Service.upsertNilai(tenant_id, parsed);
      return sendResponse(reply, 200, true, 'Nilai projek P5 berhasil disimpan', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal menyimpan nilai projek P5', error);
    }
  }

  static async upsertBulkNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = bulkP5NilaiSiswaSchema.parse(req.body);

      const result = await P5Service.upsertBulkNilai(tenant_id, parsed);
      return sendResponse(reply, 200, true, `Berhasil menyimpan ${result.length} nilai projek P5 siswa`, result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal menyimpan nilai projek P5 massal', error);
    }
  }

  static async getNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { projek_id, siswa_id, dimensi } = req.query;

      const result = await P5Service.getNilai(tenant_id, {
        projek_id,
        siswa_id,
        dimensi,
      });

      return sendResponse(reply, 200, true, 'Daftar nilai projek P5 berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat nilai projek P5', error);
    }
  }

  // === TIM FASILITATOR ===
  static async getMyProjects(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const userId = req.user!.id || req.user!.userId;
      const { tahun_pelajaran_id, semester_id } = req.query;

      // Find guru corresponding to logged in user
      const guru = await req.server.prisma.guru.findFirst({
        where: { user_id: userId, tenant_id },
      });

      if (!guru) {
        return sendResponse(reply, 200, true, 'User bukan akun guru terdaftar', []);
      }

      const result = await P5Service.getMyProjects(tenant_id, guru.id, {
        tahun_pelajaran_id,
        semester_id,
      });

      return sendResponse(reply, 200, true, 'Daftar projek binaan guru berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'P5 Fasilitator controller error');
      return sendError(reply, 500, 'Gagal memuat projek fasilitator guru', error);
    }
  }

  static async getFasilitator(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id: projek_id } = req.params;

      const result = await P5Service.getFasilitator(tenant_id, projek_id);
      return sendResponse(reply, 200, true, 'Daftar tim fasilitator projek berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'P5 Fasilitator controller error');
      return sendError(reply, 500, 'Gagal memuat tim fasilitator projek', error);
    }
  }

  static async upsertFasilitator(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id: projek_id } = req.params;
      const { guru_id, kelas_ids } = req.body;

      if (!guru_id) {
        return reply.status(400).send({
          success: false,
          message: 'guru_id wajib diisi',
        });
      }

      const result = await P5Service.upsertFasilitator(tenant_id, projek_id, {
        guru_id,
        kelas_ids: Array.isArray(kelas_ids) ? kelas_ids : [],
      });

      return sendResponse(reply, 200, true, 'Tim fasilitator projek berhasil diperbarui', result);
    } catch (error) {
      appLogger.error({ err: error }, 'P5 Fasilitator controller error');
      return sendError(reply, 500, 'Gagal memperbarui tim fasilitator projek', error);
    }
  }

  static async removeFasilitator(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id: projek_id, guru_id } = req.params;

      await P5Service.removeFasilitator(tenant_id, projek_id, guru_id);
      return sendResponse(reply, 200, true, 'Guru berhasil dihapus dari tim fasilitator projek');
    } catch (error) {
      appLogger.error({ err: error }, 'P5 Fasilitator controller error');
      return sendError(reply, 500, 'Gagal menghapus guru dari tim fasilitator', error);
    }
  }
}
