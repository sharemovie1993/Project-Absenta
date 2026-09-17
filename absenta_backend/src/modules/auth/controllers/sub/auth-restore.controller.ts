import { migrationBundleService } from '@/modules/backup/services/migration-bundle.service';
import { prisma } from '@/utils/prisma';

export const authRestoreController = {
  /**
   * Menginspeksi berkas cadangan .absenta dan mengembalikan preview manifest
   * Endpoint public (dapat diakses saat fresh deploy tanpa login)
   */
  async inspectInitialBundle(request: any, reply: any) {
    try {
      const filePart = await request.file();
      if (!filePart) {
        return reply.status(400).send({
          success: false,
          message: 'Berkas cadangan (.absenta) wajib diunggah.'
        });
      }

      const buffer = await filePart.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Berkas cadangan kosong atau tidak terbaca.'
        });
      }

      const manifest = migrationBundleService.inspectBundle(buffer);

      return reply.send({
        success: true,
        data: manifest,
        message: 'Berkas cadangan valid dan siap dipulihkan.'
      });
    } catch (error: any) {
      console.error('[AuthRestoreController] inspectInitialBundle error:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal memeriksa berkas cadangan.'
      });
    }
  },

  /**
   * Memulihkan sistem dari berkas .absenta pada saat fresh deploy (onboarding)
   * Hanya diperbolehkan jika belum ada tenant sekolah yang aktif di database
   */
  async restoreInitialBundle(request: any, reply: any) {
    try {
      // 1. Guard keamanan: pastikan server belum memiliki tenant sekolah aktif
      const tenantCount = await prisma.tenant.count({
        where: {
          AND: [
            { subdomain: { not: null } },
            { subdomain: { not: '' } },
            { subdomain: { notIn: ['app', 'system'] } }
          ]
        }
      });

      // Jika sudah ada tenant terdaftar dan bukan superadmin, tolak permintaan
      const isSuperAdmin = request.user?.roleName === 'SUPERADMIN';
      if (tenantCount > 0 && !isSuperAdmin) {
        return reply.status(403).send({
          success: false,
          message: 'Server ini sudah memiliki sekolah yang aktif. Pemulihan awal (fresh deploy) ditolak demi keamanan data.'
        });
      }

      const filePart = await request.file();
      if (!filePart) {
        return reply.status(400).send({
          success: false,
          message: 'Berkas cadangan (.absenta) wajib diunggah.'
        });
      }

      const buffer = await filePart.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Berkas cadangan kosong.'
        });
      }

      console.log(`[AuthRestoreController] Memulai restorasi initial bundle (${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

      const result = await migrationBundleService.restoreBundle(buffer, {
        isInitialFreshSetup: true,
        clearExisting: false
      });

      return reply.send({
        success: true,
        data: {
          manifest: result.manifest,
          restoredTables: result.restoredTables,
          redirect_url: '/login'
        },
        message: result.message
      });
    } catch (error: any) {
      console.error('[AuthRestoreController] restoreInitialBundle error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Proses pemulihan gagal: ' + (error.message || 'Kesalahan internal server.')
      });
    }
  }
};
