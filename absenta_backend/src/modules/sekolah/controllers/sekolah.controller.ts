import { SekolahService, SekolahPayload, SekolahUpdatePayload } from '../services/sekolah.service';
import { RoleName } from '@/constants/enums';
import { isSystemSuperAdmin } from '@/utils/rbac';

const sekolahService = new SekolahService();

export const sekolahController = {
  async lookupNpsn(request: any, reply: any) {
    try {
      const { npsn } = request.params || {};
      const result = await sekolahService.lookupMasterByNpsn(String(npsn ?? ''));
      if (!result) {
        return reply.status(404).send({
          success: false,
          message: 'Sekolah tidak ditemukan',
          data: null,
        });
      }
      return reply.status(200).send({
        success: true,
        message: 'Sekolah ditemukan',
        data: result,
      });
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : 'Internal server error';
      if (String(msg).toLowerCase().includes('npsn')) {
        return reply.status(400).send({ success: false, message: msg, data: null });
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  async getCurrent(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const sekolah = await sekolahService.getByTenant(tenantId);
      return reply.status(200).send({
        success: true,
        message: 'Sekolah profile fetched',
        data: sekolah,
      });
    } catch (e) {
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  async create(request: any, reply: any) {
    try {
      const user = request.user!;
      if (!(isSystemSuperAdmin(user.roleName, user.tenantId) || user.roleName === RoleName.ADMIN)) {
        return reply.status(403).send({ success: false, message: 'Forbidden: Insufficient permissions', data: null });
      }

      const tenantId = user.tenantId || user.tenant_id;
      const input = request.body as SekolahPayload;
      if (!input?.nama) {
        return reply.status(400).send({ success: false, message: 'Missing required field: nama', data: null });
      }

      const sekolah = await sekolahService.create(String(tenantId), input);
      return reply.status(201).send({ success: true, message: 'Sekolah created', data: sekolah });
    } catch (e: any) {
      if (e instanceof Error && e.message.includes('already exists')) {
        return reply.status(400).send({ success: false, message: e.message, data: null });
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },

  async update(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = user?.tenantId || user?.tenant_id || request.tenantId;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found', data: null });
      }

      const input = request.body as SekolahUpdatePayload;
      const roleName = user?.roleName || user?.role?.name || 'ADMIN';
      const sekolah = await sekolahService.update(roleName, tenantId, input);
      return reply.status(200).send({ success: true, message: 'Sekolah updated', data: sekolah });
    } catch (e: any) {
      if (e instanceof Error && (e.message.includes('not found') || e.message.includes('Tenant ID'))) {
        return reply.status(400).send({ success: false, message: e.message, data: null });
      }
      return reply.status(500).send({ success: false, message: 'Internal server error', data: null });
    }
  },
};
