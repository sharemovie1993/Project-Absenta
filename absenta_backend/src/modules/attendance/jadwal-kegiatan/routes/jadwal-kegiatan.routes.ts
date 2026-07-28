import { jadwalKegiatanController } from '../controllers/jadwal-kegiatan.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jadwalKegiatanRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [
      requireCapability(['kesiswaan.schedules.view.list', 'attendance.schedules.view.list', 'academic.schedules.view.list', 'kesiswaan.kegiatan.view']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getAll);

  fastify.get('/:id', {
    preHandler: [
      requireCapability(['kesiswaan.schedules.view.list', 'attendance.schedules.view.list', 'academic.schedules.view.list', 'kesiswaan.kegiatan.view']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getDetail);

  fastify.post('/', {
    preHandler: [
      requireCapability(['kesiswaan.schedules.create', 'attendance.schedules.create', 'academic.schedules.create', 'kesiswaan.kegiatan.manage']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.create);

  fastify.put('/:id', {
    preHandler: [
      requireCapability(['kesiswaan.schedules.update', 'attendance.schedules.update', 'academic.schedules.update', 'kesiswaan.kegiatan.manage']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.update);

  fastify.delete('/:id', {
    preHandler: [
      requireCapability(['kesiswaan.schedules.delete', 'attendance.schedules.delete', 'academic.schedules.delete', 'kesiswaan.kegiatan.manage']),
      determineDataScope()
    ]
  }, jadwalKegiatanController.delete);
}
