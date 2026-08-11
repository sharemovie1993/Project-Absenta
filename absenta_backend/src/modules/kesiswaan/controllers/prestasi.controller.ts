import { PrestasiService } from '../services/prestasi.service';
import { sendResponse, sendError } from '../../../utils/response';
import { z } from 'zod';
import {
  createJenisPrestasiSchema,
  updateJenisPrestasiSchema,
  createPrestasiSiswaSchema,
  updatePrestasiSiswaSchema
} from '../services/kesiswaan-validation.schema';

export class PrestasiController {
  // === Jenis Prestasi ===
  static async createJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = createJenisPrestasiSchema.parse(req.body);
      const result = await PrestasiService.createJenisPrestasi(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Kategori prestasi berhasil dibuat', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Gagal membuat kategori prestasi', error);
    }
  }

  static async updateJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updateJenisPrestasiSchema.parse(req.body);
      const result = await PrestasiService.updateJenisPrestasi(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Kategori prestasi berhasil diperbarui', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Gagal diperbarui kategori prestasi', error);
    }
  }

  static async deleteJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await PrestasiService.deleteJenisPrestasi(tenant_id, id);
      return sendResponse(reply, 200, true, 'Kategori prestasi berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus kategori prestasi', error);
    }
  }

  static async getAllJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await PrestasiService.getAllJenisPrestasi(tenant_id);
      return sendResponse(reply, 200, true, 'Daftar kategori prestasi berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil daftar kategori prestasi', error);
    }
  }

  // === Prestasi Siswa ===
  static async createPrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = createPrestasiSiswaSchema.parse(req.body);
      const result = await PrestasiService.createPrestasiSiswa(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Prestasi siswa berhasil dicatat', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Gagal mencatat prestasi siswa', error);
    }
  }

  static async updatePrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updatePrestasiSiswaSchema.parse(req.body);
      const result = await PrestasiService.updatePrestasiSiswa(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Prestasi siswa berhasil diperbarui', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Gagal memperbarui prestasi siswa', error);
    }
  }

  static async deletePrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await PrestasiService.deletePrestasiSiswa(tenant_id, id);
      return sendResponse(reply, 200, true, 'Catatan prestasi berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus catatan prestasi', error);
    }
  }

  static async getAllPrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await PrestasiService.getAllPrestasiSiswa(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data prestasi siswa berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data prestasi siswa', error);
    }
  }

  /**
   * GET /kesiswaan/prestasi/me
   * Endpoint khusus siswa untuk melihat prestasi milik sendiri.
   * Tidak memerlukan capability tambahan — cukup login sebagai siswa.
   */
  static async getMyPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const userId = req.user?.id || req.user?.userId;

      // Cari siswa berdasarkan user_id (siswa_id tidak ada di JWT payload)
      const { prisma } = await import('../../../utils/prisma');
      const siswa = await prisma.siswa.findFirst({
        where: { tenant_id, user_id: userId },
        select: { id: true },
      });

      if (!siswa) {
        return reply.status(403).send({
          success: false,
          message: 'Akun ini tidak terhubung ke data siswa.',
        });
      }

      const result = await PrestasiService.getAllPrestasiSiswa(tenant_id, {
        ...req.query,
        siswa_id: siswa.id,
        limit: req.query.limit || 50,
      });
      return reply.status(200).send({ success: true, message: 'Prestasi saya berhasil diambil', data: result });
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Gagal mengambil data prestasi', error });
    }
  }

  static async seedDefaults(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const count = await PrestasiService.countJenisPrestasi(tenant_id);
      if (count > 0) {
        return sendResponse(reply, 400, false, 'Data jenis prestasi is not empty');
      }
      await PrestasiService.seedDefaultJenisPrestasiForTenant(tenant_id);
      return sendResponse(reply, 201, true, 'Default data seeded successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to seed default data', error);
    }
  }

  static async getLeaderboard(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const result = await PrestasiService.getLeaderboard(tenant_id, limit);
      return sendResponse(reply, 200, true, 'Leaderboard prestasi berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil leaderboard prestasi', error);
    }
  }
}
