import { jadwalKBMController } from '../controllers/jadwal-kbm.controller';
import { allowBothModes } from '../../../../middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jadwalKBMRoutes(fastify: any) {
  fastify.register(async (router: any) => {
    router.addHook('preHandler', allowBothModes);

    router.get(
      '/',
      {
        preHandler: [
          requireCapability('attendance.schedules.view.list'),
          determineDataScope(),
        ],
      },
      (req: any, reply: any) => jadwalKBMController.list(req, reply),
    );
    router.get(
      '/my',
      {
        preHandler: [
          requireCapability('attendance.schedules.view.list'),
        ],
      },
      (req: any, reply: any) => jadwalKBMController.listMySchedule(req, reply),
    );
    router.get(
      '/:id',
      {
        preHandler: [
          requireCapability('attendance.schedules.view.list'),
        ],
      },
      (req: any, reply: any) => jadwalKBMController.getDetail(req, reply),
    );
    router.post(
      '/',
      {
        preHandler: [
          requireCapability('attendance.schedules.create'),
        ],
      },
      (req: any, reply: any) => jadwalKBMController.create(req, reply),
    );
    router.put(
      '/:id',
      {
        preHandler: [
          requireCapability('attendance.schedules.update'),
        ],
      },
      (req: any, reply: any) => jadwalKBMController.update(req, reply),
    );
    router.delete(
      '/:id',
      {
        preHandler: [
          requireCapability('attendance.schedules.delete'),
        ],
      },
      (req: any, reply: any) => jadwalKBMController.delete(req, reply),
    );

    router.get(
      '/import/template',
      {
        preHandler: [requireCapability('attendance.schedules.create')],
      },
      (req: any, reply: any) => jadwalKBMController.getImportTemplate(req, reply),
    );

    router.post(
      '/import',
      {
        preHandler: [requireCapability('attendance.schedules.create')],
      },
      (req: any, reply: any) => jadwalKBMController.importFromExcel(req, reply),
    );
  });
}
