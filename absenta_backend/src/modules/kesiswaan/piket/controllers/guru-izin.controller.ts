import { GuruIzinService, CreatePermohonanIzinGuruInput } from '../services/guru-izin.service';
import { prisma } from '../../../../utils/prisma';

export class GuruIzinController {
  /**
   * POST /piket/guru-izin - Ajukan Permohonan Izin / Dinas
   */
  static async create(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const body = request.body as CreatePermohonanIzinGuruInput;

      let guruId = body.guru_id;

      // Jika user yang login adalah guru dan tidak memilih guru_id, otomatis gunakan guru_id miliknya
      if (!guruId) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id: tenantId },
          select: { id: true }
        });
        if (guru) {
          guruId = guru.id;
        } else {
          return reply.status(400).send({
            success: false,
            message: 'guru_id wajib diisi atau akun Anda belum terhubung dengan data Guru.'
          });
        }
      }

      const result = await GuruIzinService.createPermohonan(tenantId, userId, {
        ...body,
        guru_id: guruId
      });

      return reply.status(201).send({
        success: true,
        message: 'Permohonan izin/dinas berhasil diajukan dan menunggu persetujuan.',
        data: result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal mengajukan permohonan izin.'
      });
    }
  }

  /**
   * GET /piket/guru-izin/preview-impact - Preview Kelas & Jam yang Terdampak
   */
  static async previewImpact(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const query = request.query as {
        guru_id: string;
        tanggal_mulai: string;
        tanggal_selesai: string;
        jam_mulai?: string;
        jam_selesai?: string;
        tipe_durasi?: string;
      };

      let guruId = query.guru_id;
      if (!guruId) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: request.user?.id, tenant_id: tenantId },
          select: { id: true }
        });
        if (guru) {
          guruId = guru.id;
        }
      }

      const result = await GuruIzinService.previewImpact(tenantId, {
        ...query,
        guru_id: guruId || query.guru_id
      });

      return reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal memuat preview dampak KBM.'
      });
    }
  }

  /**
   * GET /piket/guru-izin/inval-recommendations - Rekomendasi Guru Inval Cerdas
   */
  static async getInvalRecommendations(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const query = request.query as {
        guru_id: string;
        tanggal_mulai: string;
        tanggal_selesai: string;
        jam_mulai?: string;
        jam_selesai?: string;
        tipe_durasi?: string;
      };

      const result = await GuruIzinService.getInvalRecommendations(tenantId, query);

      return reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal memuat rekomendasi guru inval.'
      });
    }
  }

  /**
   * GET /piket/guru-izin - Daftar Permohonan Izin (Untuk Piket / Kepsek)
   */
  static async getAll(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const query = request.query as any;

      const result = await GuruIzinService.getPermohonanList(tenantId, query);

      return reply.send({
        success: true,
        ...result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil daftar permohonan izin guru.'
      });
    }
  }

  /**
   * GET /piket/guru-izin/me - Riwayat Permohonan Saya (Untuk Guru)
   */
  static async getMyList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id;

      const guru = await prisma.guru.findFirst({
        where: { user_id: userId, tenant_id: tenantId },
        select: { id: true }
      });

      if (!guru) {
        return reply.send({
          success: true,
          data: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
        });
      }

      const result = await GuruIzinService.getPermohonanList(tenantId, {
        guru_id: guru.id,
        ...(request.query as any)
      });

      return reply.send({
        success: true,
        ...result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil riwayat izin saya.'
      });
    }
  }

  /**
   * PATCH /piket/guru-izin/:id/approve - Setujui Permohonan Izin
   */
  static async approve(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const { id } = request.params as { id: string };
      const body = request.body as { guru_inval_id?: string } | undefined;
      const guruInvalId = body?.guru_inval_id;

      const result = await GuruIzinService.approvePermohonan(tenantId, id, userId, guruInvalId);

      return reply.send({
        success: true,
        message: 'Permohonan izin guru berhasil disetujui.',
        data: result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal menyetujui permohonan izin.'
      });
    }
  }

  /**
   * PATCH /piket/guru-izin/:id/reject - Tolak Permohonan Izin
   */
  static async reject(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const { id } = request.params as { id: string };
      const { catatan } = (request.body || {}) as { catatan?: string };

      const result = await GuruIzinService.rejectPermohonan(tenantId, id, userId, catatan);

      return reply.send({
        success: true,
        message: 'Permohonan izin guru telah ditolak.',
        data: result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal menolak permohonan izin.'
      });
    }
  }

  /**
   * DELETE /piket/guru-izin/:id - Hapus / Batalkan Permohonan Izin
   */
  static async delete(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id;
      const { id } = request.params as { id: string };

      const result = await GuruIzinService.deletePermohonan(tenantId, id, userId);

      return reply.send({
        success: true,
        message: 'Permohonan izin guru berhasil dihapus.',
        data: result
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal menghapus permohonan izin.'
      });
    }
  }
}
