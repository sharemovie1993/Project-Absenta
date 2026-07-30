import { JadwalPiketController } from '../controllers/jadwal-piket.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export async function jadwalPiketRoutes(fastify: any) {
  const controller = new JadwalPiketController();

  // GET /api/kurikulum/jadwal-piket
  fastify.get('/', {
    preHandler: [requireCapability('academic.schedules.view.list'), determineDataScope()],
    handler: controller.getList.bind(controller)
  });

  // GET /api/kurikulum/jadwal-piket/hari-ini (Bisa diakses juga oleh modul Piket Kesiswaan)
  fastify.get('/hari-ini', {
    preHandler: [determineDataScope()],
    handler: controller.getHariIni.bind(controller)
  });

  // GET /api/kurikulum/jadwal-piket/teaching-load
  fastify.get('/teaching-load', {
    preHandler: [determineDataScope()],
    handler: controller.getTeachingLoad.bind(controller)
  });

  // POST /api/kurikulum/jadwal-piket
  fastify.post('/', {
    preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()],
    handler: controller.create.bind(controller)
  });

  // POST /api/kurikulum/jadwal-piket/bulk
  fastify.post('/bulk', {
    preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()],
    handler: controller.bulkCreate.bind(controller)
  });

  // GET /api/kurikulum/jadwal-piket/notif-config
  fastify.get('/notif-config', {
    preHandler: [determineDataScope()],
    handler: controller.getNotifConfig.bind(controller)
  });

  // POST /api/kurikulum/jadwal-piket/notif-config
  fastify.post('/notif-config', {
    preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()],
    handler: controller.saveNotifConfig.bind(controller)
  });

  // POST /api/kurikulum/jadwal-piket/test-notif
  fastify.post('/test-notif', {
    preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()],
    handler: controller.testNotif.bind(controller)
  });

  // PUT /api/kurikulum/jadwal-piket/:id
  fastify.put('/:id', {
    preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()],
    handler: controller.update.bind(controller)
  });

  // DELETE /api/kurikulum/jadwal-piket/:id
  fastify.delete('/:id', {
    preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()],
    handler: controller.delete.bind(controller)
  });
}

