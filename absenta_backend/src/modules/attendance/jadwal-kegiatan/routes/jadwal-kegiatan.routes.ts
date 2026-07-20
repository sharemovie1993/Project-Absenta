import { jadwalKegiatanController } from '../controllers/jadwal-kegiatan.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jadwalKegiatanRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [
      requireCapability('kesiswaan.schedules.view.list'),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getAll);

  fastify.get('/:id', {
    preHandler: [
      requireCapability('kesiswaan.schedules.view.list'),
      determineDataScope()
    ]
  }, jadwalKegiatanController.getDetail);

  fastify.post('/', {
    preHandler: [
      requireCapability('kesiswaan.schedules.create'),
      determineDataScope()
    ]
  }, jadwalKegiatanController.create);

  fastify.put('/:id', {
    preHandler: [
      requireCapability('kesiswaan.schedules.update'),
      determineDataScope()
    ]
  }, jadwalKegiatanController.update);

  fastify.delete('/:id', {
    preHandler: [
      requireCapability('kesiswaan.schedules.delete'),
      determineDataScope()
    ]
  }, jadwalKegiatanController.delete);
}
