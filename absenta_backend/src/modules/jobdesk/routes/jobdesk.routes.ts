import { jobdeskController } from '../controllers/jobdesk.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function jobdeskRoutes(fastify: any) {
  // GET /jobdesk/my - Mengambil data jobdesk milik pengguna saat ini (terbuka untuk semua user aktif)
  fastify.get('/my', {
    preHandler: [requireCapability('dashboard.view.overview')],
    handler: jobdeskController.getMyJobdesk.bind(jobdeskController),
  });

  // GET /jobdesk/admin/roles - List Role + Jobdesk (Editor Admin)
  fastify.get('/admin/roles', {
    preHandler: [requireCapability('core.users.view.list')],
    handler: jobdeskController.getAllRoleJobdesks.bind(jobdeskController),
  });

  // PUT /jobdesk/admin/roles/:id - Simpan/Update Jobdesk Role (Editor Admin)
  fastify.put('/admin/roles/:id', {
    preHandler: [requireCapability('core.users.roles.permissions.update')],
    handler: jobdeskController.updateRoleJobdesk.bind(jobdeskController),
  });

  // GET /jobdesk/admin/positions - List Jabatan Organisasi + Jobdesk (Editor Admin Sekolah)
  fastify.get('/admin/positions', {
    preHandler: [requireCapability('academic.structure.manage')],
    handler: jobdeskController.getAllPositionJobdesks.bind(jobdeskController),
  });

  // PUT /jobdesk/admin/positions/:id - Simpan/Update Jobdesk Jabatan Organisasi (Editor Admin Sekolah)
  fastify.put('/admin/positions/:id', {
    preHandler: [requireCapability('academic.structure.manage')],
    handler: jobdeskController.updatePositionJobdesk.bind(jobdeskController),
  });
}
