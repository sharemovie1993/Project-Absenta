import { migrationBundleService } from '@/modules/backup/services/migration-bundle.service';
import { prisma } from '@/utils/prisma';
import { isOnPremiseScenario } from '@/utils/deployScenario';

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

      // 1. Validasi struktur arsip cadangan & periksa manifest
      let manifest;
      try {
        manifest = migrationBundleService.inspectBundle(buffer);
      } catch (inspectErr: any) {
        return reply.status(400).send({
          success: false,
          message: 'Berkas cadangan tidak valid: ' + (inspectErr.message || 'Manifest rusak.')
        });
      }

      const isSuperAdmin = request.user?.roleName === 'SUPERADMIN';
      const isSingleTenant = isOnPremiseScenario();
      const targetSubdomain = manifest.source_tenant?.subdomain?.trim().toLowerCase();
      const targetNpsn = manifest.source_tenant?.npsn?.trim();
      const targetTenantId = manifest.source_tenant?.id;

      if (isSingleTenant) {
        // Skenario ONPREMISE: Server mandiri 1 sekolah fisik.
        // Pemulihan fresh onboarding hanya diperbolehkan jika belum ada sekolah terdaftar di database.
        const tenantCount = await prisma.tenant.count({
          where: {
            AND: [
              { subdomain: { not: null } },
              { subdomain: { not: '' } },
              { subdomain: { notIn: ['app', 'system'] } }
            ]
          }
        });

        if (tenantCount > 0 && !isSuperAdmin) {
          return reply.status(403).send({
            success: false,
            message: 'Server on-premise ini sudah memiliki sekolah yang aktif. Pemulihan awal ditolak demi keamanan data.'
          });
        }
      } else {
        // Skenario SAAS (saas-local & saas-public - Multi-Tenant):
        // Server dirancang menampung banyak sekolah. Keberadaan sekolah lain tidak boleh memblokir onboarding baru.

        // Proteksi Anti-Hijack: Subdomain yang sudah aktif tidak boleh ditimpa via onboarding publik tanpa autentikasi
        if (targetSubdomain) {
          const existingTenant = await prisma.tenant.findFirst({
            where: { subdomain: { equals: targetSubdomain, mode: 'insensitive' } }
          });

          if (existingTenant && !isSuperAdmin) {
            return reply.status(409).send({
              success: false,
              message: `Subdomain '${targetSubdomain}' sudah terdaftar dan aktif di server ini. Pemulihan ke tenant yang sudah ada wajib dilakukan oleh Administrator yang terautentikasi melalui menu Pengaturan Cadangan.`
            });
          }
        }

        // Proteksi Anti-Duplikasi: NPSN sekolah tidak boleh bentrok dengan tenant lain di platform yang sama
        if (targetNpsn) {
          const existingSekolah = await prisma.sekolah.findFirst({
            where: { npsn: targetNpsn }
          });

          if (existingSekolah && !isSuperAdmin && existingSekolah.tenant_id !== targetTenantId) {
            return reply.status(409).send({
              success: false,
              message: `Sekolah dengan NPSN ${targetNpsn} (${existingSekolah.nama}) sudah terdaftar pada tenant lain di platform ini.`
            });
          }
        }
      }

      console.log(`[AuthRestoreController] Memulai restorasi initial bundle untuk '${manifest.source_tenant?.name || 'Sekolah'}' (${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

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
