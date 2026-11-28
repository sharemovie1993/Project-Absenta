import { RoleName } from '@/constants/enums';
import { jadwalKegiatanController } from '../controllers/jadwal-kegiatan.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jadwalKegiatanRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [
      requireCapability(['attendance.schedules.view.list', 'academic.schedules.view.list', 'kesiswaan.schedules.view.list'], { exemptRoles: [RoleName.SISWA, RoleName.GURU] }),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getAll);

  fastify.get('/policy-summary', {
    preHandler: [
      requireCapability(
        [
          'attendance.schedules.view.list',
          'academic.schedules.view.list',
          'kesiswaan.schedules.view.list',
          'core.tenants.view.detail',
        ],
        { exemptRoles: [RoleName.ADMIN, RoleName.GURU] }
      ),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getPolicySummary);

  fastify.put('/policy/:id', {
    preHandler: [
      requireCapability(
        [
          'attendance.schedules.update',
          'academic.schedules.update',
          'attendance.schedules.manage',
          'core.tenants.update',
          'core.sekolah.update.profile',
        ],
        { exemptRoles: [RoleName.ADMIN] }
      ),
      determineDataScope()
    ]
  }, jadwalKegiatanController.updatePolicy);

  fastify.get('/:id', {
    preHandler: [
      requireCapability(['attendance.schedules.view.list', 'academic.schedules.view.list']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getDetail);

  fastify.post('/', {
    preHandler: [
      requireCapability(['attendance.schedules.create', 'academic.schedules.create']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.create);

  fastify.put('/:id', {
    preHandler: [
      requireCapability(['attendance.schedules.update', 'academic.schedules.update']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.update);

  fastify.delete('/:id', {
    preHandler: [
      requireCapability(['attendance.schedules.delete', 'academic.schedules.delete']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.delete);
}
