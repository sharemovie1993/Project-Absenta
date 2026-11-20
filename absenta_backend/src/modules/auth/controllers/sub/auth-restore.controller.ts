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
   * Mendukung mode Pemulihan Asal (Fresh Setup) maupun Kloning ke Subdomain Baru (Trial 14 Hari)
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

      // 2. Baca field form multipart jika ada (targetSubdomain, targetName, cloneMode)
      const fields: Record<string, any> = (filePart as any).fields || {};
      const readField = (key: string): any => {
        const f = fields[key];
        if (f && typeof f === 'object' && 'value' in f) return f.value;
        return undefined;
      };

      const cloneModeRaw = request.query?.cloneMode ?? readField('cloneMode') ?? request.body?.cloneMode;
      const isExplicitClone = cloneModeRaw === true || cloneModeRaw === 'true' || cloneModeRaw === '1' || cloneModeRaw === 1;

      const requestedSubdomain = (
        request.query?.targetSubdomain ||
        readField('targetSubdomain') ||
        request.body?.targetSubdomain
      )?.toString().trim().toLowerCase();

      const requestedName = (
        request.query?.targetName ||
        readField('targetName') ||
        request.body?.targetName
      )?.toString().trim();

      const isSuperAdmin = request.user?.roleName === 'SUPERADMIN';
      const isSingleTenant = isOnPremiseScenario();
      const sourceSubdomain = (manifest.source_tenant?.subdomain || '').trim().toLowerCase();
      const sourceName = manifest.source_tenant?.name || 'Sekolah';
      const targetNpsn = manifest.source_tenant?.npsn?.trim();
      const targetTenantId = manifest.source_tenant?.id;

      const isCloning = isExplicitClone || (!!requestedSubdomain && requestedSubdomain !== sourceSubdomain);
      let targetSubdomain = requestedSubdomain;

      if (isCloning) {
        // --- SKENARIO KLONING DI LUAR LOGIN ---
        if (!targetSubdomain) {
          targetSubdomain = `${sourceSubdomain || 'sekolah'}-demo`;
        }

        if (!/^[a-z0-9-]+$/.test(targetSubdomain)) {
          return reply.status(400).send({
            success: false,
            message: 'Subdomain target hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).'
          });
        }

        if (sourceSubdomain && targetSubdomain === sourceSubdomain) {
          return reply.status(400).send({
            success: false,
            message: `Subdomain untuk kloning tidak boleh sama dengan subdomain asal ("${sourceSubdomain}"). Gunakan subdomain baru.`
          });
        }

        // Cek bentrok subdomain di database
        const existingTenant = await prisma.tenant.findUnique({
          where: { subdomain: targetSubdomain }
        });
        if (existingTenant) {
          return reply.status(409).send({
            success: false,
            message: `Subdomain '${targetSubdomain}' sudah terdaftar dan aktif. Silakan pilih subdomain lain.`
          });
        }
      } else {
        // --- SKENARIO RESTORE ASLI DI LUAR LOGIN (FRESH ONBOARDING) ---
        targetSubdomain = sourceSubdomain;

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
              message: 'Server on-premise ini sudah memiliki sekolah yang aktif. Untuk membuat replika demo tanpa menimpa data, gunakan opsi Kloning dengan subdomain baru.'
            });
          }
        } else {
          // Skenario SAAS (Multi-Tenant):
          // Proteksi Anti-Hijack: Subdomain yang sudah aktif tidak boleh ditimpa via onboarding publik tanpa autentikasi
          if (targetSubdomain) {
            const existingTenant = await prisma.tenant.findFirst({
              where: { subdomain: { equals: targetSubdomain, mode: 'insensitive' } }
            });

            if (existingTenant && !isSuperAdmin) {
              return reply.status(409).send({
                success: false,
                message: `Subdomain '${targetSubdomain}' sudah terdaftar di server ini. Jika Anda ingin membuat salinan demo, pilih opsi Kloning dengan subdomain baru.`
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
      }

      console.log(`[AuthRestoreController] Memulai ${isCloning ? 'kloning' : 'restorasi'} initial bundle untuk '${sourceName}' (target: ${targetSubdomain}, ${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

      const result = await migrationBundleService.restoreBundle(buffer, {
        targetSubdomain: isCloning ? targetSubdomain : undefined,
        targetName: isCloning ? (requestedName || `${sourceName} (Demo)`) : undefined,
        cloneMode: isCloning,
        isInitialFreshSetup: true,
        clearExisting: false
      });

      return reply.send({
        success: true,
        data: {
          manifest: result.manifest,
          restoredTables: result.restoredTables,
          targetSubdomain: result.targetSubdomain || targetSubdomain,
          targetName: requestedName || result.manifest?.source_tenant?.name || sourceName,
          isCloned: result.isCloned || isCloning,
          redirect_url: '/login'
        },
        message: result.message
      });
    } catch (error: any) {
      console.error('[AuthRestoreController] restoreInitialBundle error:', error);
      const statusCode = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
      return reply.status(statusCode).send({
        success: false,
        message: 'Proses pemulihan gagal: ' + (error.message || 'Kesalahan internal server.')
      });
    }
  }
};
