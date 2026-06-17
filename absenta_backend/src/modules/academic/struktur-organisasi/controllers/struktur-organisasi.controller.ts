import { StrukturOrganisasiService } from '../services/struktur-organisasi.service';
import { RoleName } from '@/constants/enums';

const service = new StrukturOrganisasiService();

const getEffectiveTenantId = (req: any) => {
  const { user } = req;
  const { tenant_id } = req.query as any;
  
  // Normalize role name check (handle user.roleName from JWT or user.role.name if populated)
  const roleName = user.roleName || user.role?.name || user.role;

  console.log('[DEBUG] getEffectiveTenantId', { 
    userRole: roleName, 
    userTenant: user.tenant_id, 
    queryTenant: tenant_id,
    isSuper: roleName === RoleName.SUPERADMIN 
  });

  // Check if user is SUPERADMIN and tenant_id query param is provided
  if (roleName === RoleName.SUPERADMIN && tenant_id) {
    return tenant_id;
  }
  return user.tenant_id;
};

export const strukturOrganisasiController = {
  getTree: async (req: any, reply: any) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const data = await service.getTree(tenantId);
      return reply.status(200).send({
        success: true,
        message: 'Berhasil mengambil data tree struktur organisasi',
        data
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  getAll: async (req: any, reply: any) => {
    const { is_active, search } = req.query as any;
    const tenantId = getEffectiveTenantId(req);

    const data = await service.findAll(tenantId, {
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      search
    });

    return reply.status(200).send({
      success: true,
      message: 'Berhasil mengambil data struktur organisasi',
      data: data.map((item: any) => ({
        ...item,
        kode: item.code,
        nama: item.name,
      }))
    });
  },

  getOne: async (req: any, reply: any) => {
    const { id } = req.params as any;
    const tenantId = getEffectiveTenantId(req);

    const data = await service.findById(tenantId, id);
    if (!data) {
      return reply.status(404).send({ success: false, message: 'Struktur organisasi tidak ditemukan' });
    }
    return reply.status(200).send({
      success: true,
      message: 'Detail struktur organisasi',
      data: {
        ...data,
        kode: data.code,
        nama: data.name,
      }
    });
  },

  getPermissions: async (req: any, reply: any) => {
    const { id } = req.params as any;
    const tenantId = getEffectiveTenantId(req);
    try {
      const data = await service.getPermissions(tenantId, id);
      return reply.status(200).send({
        success: true,
        message: 'Berhasil mengambil permissions untuk struktur organisasi',
        data
      });
    } catch (error: any) {
      if (error instanceof Error && String(error.message || '').toLowerCase().includes('not found')) {
        return reply.status(404).send({ success: false, message: error.message });
      }
      return reply.status(400).send({ success: false, message: 'Gagal mengambil permissions struktur organisasi' });
    }
  },

  updatePermissions: async (req: any, reply: any) => {
    const { user } = req as any;
    const { id } = req.params as any;
    const body = req.body as any;
    const permissionIds = Array.isArray(body?.permission_ids) ? body.permission_ids : [];
    const tenantId = getEffectiveTenantId(req);

    try {
      const before = await service.getPermissions(tenantId, id);
      const data = await service.updatePermissions(tenantId, id, permissionIds);

      try {
        await service.logAdminUpdateStrukturPermissions({
          tenantId,
          userId: user.id,
          strukturId: String(id),
          previousPermissionIds: before,
          newPermissionIds: data,
          ip: req.ip
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }

      return reply.status(200).send({
        success: true,
        message: 'Berhasil memperbarui permissions struktur organisasi',
        data
      });
    } catch (error: any) {
      if (error instanceof Error && String(error.message || '').toLowerCase().includes('not found')) {
        return reply.status(404).send({ success: false, message: error.message });
      }
      return reply.status(400).send({ success: false, message: 'Gagal memperbarui permissions struktur organisasi' });
    }
  },

  distributePermissions: async (req: any, reply: any) => {
    const { user } = req as any;
    const { id } = req.params as any;
    // For distribute, we treat the current structure as the Source Template.
    // So we use the effective tenant ID to find the source.
    const tenantId = getEffectiveTenantId(req);

    try {
      // Check if user is authorized (Superadmin only ideally, but we rely on capability check 'academic.structures.update' or similar, 
      // but strictly speaking this is a high-level action. Let's assume standard 'academic.structures.update' is enough 
      // OR we add a specific check here if needed. For now, rely on route middleware).
      
      const result = await service.distributePermissions(tenantId, id);

      try {
        const sourcePermissionIds = await service.getPermissions(tenantId, id);
        await service.logDistributeStrukturPermissions({
          tenantId,
          userId: user.id,
          strukturId: String(id),
          sourcePermissionIds,
          affectedCount: result.affected,
          ip: req.ip
        });
      } catch (logError) {
        console.error('Failed to create activity log', logError);
      }

      return reply.status(200).send({
        success: true,
        message: 'Berhasil mendistribusikan permission',
        data: result
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message || 'Gagal mendistribusikan permission' });
    }
  },

  create: async (req: any, reply: any) => {
    const body = req.body as any;
    // Create usually uses user's tenant, but if superadmin wants to create for another tenant?
    // For now, let's stick to user's tenant for creation or allow body override?
    // The service takes tenantId.
    // Let's assume creation is always for the user's tenant unless we implement specific tenant selection in UI.
    // The user's request was about "filterisasi" (viewing).
    // But let's apply the same logic for consistency if tenant_id is in query.
    const tenantId = getEffectiveTenantId(req);

    try {
      const data = await service.create(tenantId, body);
      return reply.status(201).send({ success: true, message: 'Berhasil membuat struktur organisasi', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  update: async (req: any, reply: any) => {
    const { id } = req.params as any;
    const body = req.body as any;
    const tenantId = getEffectiveTenantId(req);

    try {
      const data = await service.update(tenantId, id, body);
      return reply.status(200).send({ success: true, message: 'Berhasil memperbarui struktur organisasi', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  delete: async (req: any, reply: any) => {
    const { id } = req.params as any;
    const tenantId = getEffectiveTenantId(req);

    try {
      await service.delete(tenantId, id);
      return reply.status(200).send({ success: true, message: 'Berhasil menghapus struktur organisasi' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },
  assignGuru: async (req: any, reply: any) => {
    const { id } = req.params as any; // struktur_id
    const body = req.body as any; // { guru_id, start_date, end_date }
    const tenantId = getEffectiveTenantId(req);

    try {
      const { user } = req as any;
      const isAuthorized = await service.isUserAuthorizedForPosition(user.id, id, tenantId);
      if (!isAuthorized) {
        return reply.status(403).send({ success: false, message: 'Anda tidak memiliki wewenang untuk mengelola struktur ini' });
      }

      const data = await service.assignGuru(tenantId, {
        struktur_id: id,
        guru_id: body.guru_id,
        unit_id: body.unit_id,
        kelas_id: body.kelas_id,
        start_date: body.start_date ? new Date(body.start_date) : undefined,
        end_date: body.end_date ? new Date(body.end_date) : undefined
      });
      return reply.status(200).send({ success: true, message: 'Berhasil menugaskan guru', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },
  removeGuru: async (req: any, reply: any) => {
    const { id, guruId } = req.params as any;
    const tenantId = getEffectiveTenantId(req);

    try {
      const { user } = req as any;
      const isAuthorized = await service.isUserAuthorizedForPosition(user.id, id, tenantId);
      if (!isAuthorized) {
        return reply.status(403).send({ success: false, message: 'Anda tidak memiliki wewenang untuk mengelola struktur ini' });
      }

      await service.removeGuru(tenantId, guruId, id);
      return reply.status(200).send({ success: true, message: 'Berhasil menghapus penugasan guru' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },
  assignSiswa: async (req: any, reply: any) => {
    const { id } = req.params as any;
    const body = req.body as any;
    const tenantId = getEffectiveTenantId(req);

    try {
      const { user } = req as any;
      const isAuthorized = await service.isUserAuthorizedForPosition(user.id, id, tenantId);
      if (!isAuthorized) {
        return reply.status(403).send({ success: false, message: 'Anda tidak memiliki wewenang untuk mengelola struktur ini' });
      }

      const data = await service.assignSiswa(tenantId, {
        struktur_id: id,
        siswa_id: body.siswa_id,
        unit_id: body.unit_id,
        kelas_id: body.kelas_id ? String(body.kelas_id) : undefined,
        start_date: body.start_date ? new Date(body.start_date) : undefined,
        end_date: body.end_date ? new Date(body.end_date) : undefined
      });
      return reply.status(200).send({ success: true, message: 'Berhasil menugaskan siswa', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },
  removeSiswa: async (req: any, reply: any) => {
    const { id, siswaId } = req.params as any;
    const tenantId = getEffectiveTenantId(req);

    try {
      const { user } = req as any;
      const isAuthorized = await service.isUserAuthorizedForPosition(user.id, id, tenantId);
      if (!isAuthorized) {
        return reply.status(403).send({ success: false, message: 'Anda tidak memiliki wewenang untuk mengelola struktur ini' });
      }

      await service.removeSiswa(tenantId, siswaId, id);
      return reply.status(200).send({ success: true, message: 'Berhasil menghapus penugasan siswa' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
};
