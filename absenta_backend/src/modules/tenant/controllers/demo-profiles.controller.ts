import * as jwt from 'jsonwebtoken';
import { demoProfilesService, DemoProfileItem } from '../services/demo-profiles.service';
import { getJwtSecret } from '../../auth/utils/auth-security.util';
import { refreshTokenService } from '../../auth/services/refresh-token.service';
import { authTenantController } from '../../auth/controllers/sub/auth-tenant.controller';
import { authorizationService } from '../../auth/services/authorization.service';
import { organizationalAuthorizationEngine } from '../../auth/services/organizational-authorization.engine';
import { prisma } from '../../../utils/prisma';

export const demoProfilesController = {
  /**
   * Public: Mengambil profil demo untuk halaman login & floating switcher
   */
  async getPublicProfiles(request: any, reply: any) {
    try {
      const tenantRecord = await authTenantController.resolveTenantByHost(request.headers);
      
      const queryTenantId = request.query?.tenant_id ? String(request.query.tenant_id).trim() : null;
      const effectiveTenantId = queryTenantId || tenantRecord?.id || null;

      const result = await demoProfilesService.getPublicProfilesForTenant(effectiveTenantId);

      return reply.send({
        success: true,
        message: 'Demo profiles retrieved',
        is_demo_enabled: result.is_demo_enabled,
        data: result.profiles,
      });
    } catch (err: any) {
      console.error('[DemoProfilesController] getPublicProfiles error:', err.message);
      return reply.status(500).send({
        success: false,
        message: 'Gagal memuat profil demo: ' + err.message,
      });
    }
  },

  /**
   * Public: Melakukan login 1-click aman ke profil demo yang dipilih
   */
  async demoLogin(request: any, reply: any) {
    try {
      const { profileId, tenantId: bodyTenantId } = (request.body || {}) as {
        profileId?: string;
        tenantId?: string;
      };

      if (!profileId) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter profileId wajib disertakan',
        });
      }

      // Resolusi tenant: body tenantId -> header/host -> fallback demo
      let resolvedTenantId = bodyTenantId?.trim() || null;
      if (!resolvedTenantId) {
        const tenantRecord = await authTenantController.resolveTenantByHost(request.headers);
        if (tenantRecord) {
          resolvedTenantId = tenantRecord.id;
        }
      }

      if (!resolvedTenantId) {
        resolvedTenantId = '2acb7e12-d264-4784-8262-8f7369061542'; // Default Demo / Dev Tenant
      }

      // Verifikasi apakah demo mode aktif untuk tenant ini
      const isEnabledRow = await prisma.config.findFirst({
        where: { tenant_id: resolvedTenantId, key: 'DEMO_MODE_ENABLED' },
      });
      if (isEnabledRow && isEnabledRow.value === 'false') {
        return reply.status(403).send({
          success: false,
          message: 'Mode demo quick login dinonaktifkan oleh administrator sekolah ini.',
        });
      }

      // Cari user tujuan
      const targetUser = await demoProfilesService.resolveTargetUserForDemoLogin(resolvedTenantId, profileId);
      if (!targetUser) {
        return reply.status(404).send({
          success: false,
          message: 'Akun untuk peran ini belum dipetakan ke pengguna aktif di sekolah.',
        });
      }

      // Generate Access Token (15 menit)
      const tokenPayload = {
        id: targetUser.id,
        email: targetUser.email,
        tenantId: targetUser.tenant_id,
        roleId: targetUser.Role?.id || targetUser.role_id || '',
        roleName: targetUser.Role?.name || 'USER',
        exp: Math.floor(Date.now() / 1000) + (15 * 60),
      };
      const token = jwt.sign(tokenPayload, getJwtSecret());

      // Generate Refresh Token
      const deviceHint = String(request.headers['user-agent'] || '').slice(0, 120);
      const refreshToken = await refreshTokenService.createRefreshToken(
        targetUser.id,
        targetUser.tenant_id || 'system',
        deviceHint,
        1
      );

      // Audit Log
      try {
        await prisma.activityLog.create({
          data: {
            tenant_id: targetUser.tenant_id || 'system',
            user_id: targetUser.id,
            action: 'DEMO_QUICK_LOGIN_SUCCESS',
            entity: 'USER',
            entity_id: targetUser.id,
            metadata: JSON.stringify({
              profileId,
              email: targetUser.email,
              role: targetUser.Role?.name,
            }),
          },
        });
      } catch {}

      // Tempelkan kapabilitas dan posisi organisasi
      let capabilities: string[] = [];
      let positionCodes: string[] = [];
      try {
        const orgCtx = await organizationalAuthorizationEngine.resolveOrganizationalContext(targetUser.id);
        capabilities = await authorizationService.resolveUserCapabilities(targetUser.id, { user: targetUser });
        positionCodes = orgCtx.positions.map((p) => p.code);
      } catch (ctxErr) {
        console.warn('[DemoProfilesController] Warning resolving context for demo user:', ctxErr);
      }

      return reply.send({
        success: true,
        message: 'Login demo berhasil',
        data: {
          token,
          refreshToken,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            full_name: targetUser.full_name,
            role: {
              id: targetUser.Role?.id || targetUser.role_id,
              name: targetUser.Role?.name || 'USER',
            },
            tenant_id: targetUser.tenant_id,
            capabilities,
            position_codes: positionCodes,
          },
        },
      });
    } catch (err: any) {
      console.error('[DemoProfilesController] demoLogin error:', err.message);
      return reply.status(500).send({
        success: false,
        message: 'Terjadi kesalahan saat masuk demo: ' + err.message,
      });
    }
  },

  /**
   * Protected (Admin): Mengambil konfigurasi pemetaan demo dan daftar user sekolah
   */
  async getManageData(request: any, reply: any) {
    try {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan pada sesi' });
      }

      const result = await demoProfilesService.getManageData(tenantId);
      return reply.send({
        success: true,
        message: 'Data pemetaan demo berhasil diambil',
        data: result,
      });
    } catch (err: any) {
      console.error('[DemoProfilesController] getManageData error:', err.message);
      return reply.status(500).send({
        success: false,
        message: 'Gagal memuat data pemetaan demo: ' + err.message,
      });
    }
  },

  /**
   * Protected (Admin): Menyimpan pemetaan profil demo kustom
   */
  async saveProfiles(request: any, reply: any) {
    try {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan pada sesi' });
      }

      const { profiles, is_demo_enabled } = request.body as {
        profiles: DemoProfileItem[];
        is_demo_enabled?: boolean;
      };

      if (!Array.isArray(profiles)) {
        return reply.status(400).send({ success: false, message: 'Payload profiles harus berupa array' });
      }

      await demoProfilesService.saveDemoProfiles(tenantId, profiles, is_demo_enabled ?? true);

      return reply.send({
        success: true,
        message: 'Pemetaan akun demo berhasil disimpan',
      });
    } catch (err: any) {
      console.error('[DemoProfilesController] saveProfiles error:', err.message);
      return reply.status(500).send({
        success: false,
        message: 'Gagal menyimpan pemetaan akun demo: ' + err.message,
      });
    }
  },

  /**
   * Protected (Admin): Reset pemetaan ke bawaan sistem
   */
  async resetProfiles(request: any, reply: any) {
    try {
      const tenantId = request.dataScope?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan pada sesi' });
      }

      await demoProfilesService.resetDemoProfiles(tenantId);

      return reply.send({
        success: true,
        message: 'Pemetaan akun demo berhasil direset ke bawaan sistem',
      });
    } catch (err: any) {
      console.error('[DemoProfilesController] resetProfiles error:', err.message);
      return reply.status(500).send({
        success: false,
        message: 'Gagal mereset pemetaan demo: ' + err.message,
      });
    }
  },
};
