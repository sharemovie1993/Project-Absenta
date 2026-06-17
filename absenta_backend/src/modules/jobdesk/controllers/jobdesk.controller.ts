import { jobdeskService } from '../services/jobdesk.service';
import { RoleName } from '../../../constants/enums';

export const jobdeskController = {
  /**
   * GET /jobdesk/my
   * Mengambil data jobdesk milik pengguna saat ini (Role utama + Jabatan Struktural Aktif)
   */
  async getMyJobdesk(request: any, reply: any) {
    try {
      const user = request.user!;
      const result = await jobdeskService.getMyJobdesk(user.id);

      reply.status(200);
      return {
        success: true,
        message: 'Jobdesk berhasil diambil',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data jobdesk';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * GET /jobdesk/admin/roles
   * Mengambil list seluruh Role beserta data jobdesk (untuk editor)
   */
  async getAllRoleJobdesks(request: any, reply: any) {
    try {
      const user = request.user!;
      // Superadmin bisa memfilter tenantId via query, Admin Sekolah terkunci ke tenant_id sendiri
      const queryTenantId = request.query?.tenantId;
      const targetTenantId = user.roleName === RoleName.SUPERADMIN ? (queryTenantId || null) : user.tenantId;

      const roles = await jobdeskService.getAllRoleJobdesks(targetTenantId);

      reply.status(200);
      return {
        success: true,
        message: 'Jobdesk Role berhasil diambil',
        data: roles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat jobdesk Role';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * PUT /jobdesk/admin/roles/:id
   * Menyimpan / Update data jobdesk untuk Role tertentu
   */
  async updateRoleJobdesk(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { description, tasks } = request.body || {};

      if (!Array.isArray(tasks)) {
        reply.status(400);
        return {
          success: false,
          message: 'Parameter tasks harus berupa array of string',
        };
      }

      const updated = await jobdeskService.updateRoleJobdesk(id, description || null, tasks);

      reply.status(200);
      return {
        success: true,
        message: 'Jobdesk Role berhasil disimpan',
        data: updated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui jobdesk Role';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * GET /jobdesk/admin/positions
   * Mengambil list seluruh Jabatan Organisasi beserta data jobdesk (untuk editor)
   */
  async getAllPositionJobdesks(request: any, reply: any) {
    try {
      const user = request.user!;
      // Admin Sekolah terkunci ke tenant_id sendiri, Superadmin wajib menyertakan or default ke tenant dev
      const queryTenantId = request.query?.tenantId;
      const targetTenantId = user.roleName === RoleName.SUPERADMIN ? queryTenantId : user.tenantId;

      if (!targetTenantId) {
        reply.status(400);
        return {
          success: false,
          message: 'Parameter tenantId dibutuhkan untuk melihat jabatan organisasi',
        };
      }

      const positions = await jobdeskService.getAllPositionJobdesks(targetTenantId);

      reply.status(200);
      return {
        success: true,
        message: 'Jobdesk Jabatan Organisasi berhasil diambil',
        data: positions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat jobdesk Jabatan Organisasi';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  /**
   * PUT /jobdesk/admin/positions/:id
   * Menyimpan / Update data jobdesk untuk Jabatan Organisasi tertentu
   */
  async updatePositionJobdesk(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { description, tasks } = request.body || {};

      if (!Array.isArray(tasks)) {
        reply.status(400);
        return {
          success: false,
          message: 'Parameter tasks harus berupa array of string',
        };
      }

      const updated = await jobdeskService.updatePositionJobdesk(id, description || null, tasks);

      reply.status(200);
      return {
        success: true,
        message: 'Jobdesk Jabatan Organisasi berhasil disimpan',
        data: updated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui jobdesk Jabatan Organisasi';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
};
