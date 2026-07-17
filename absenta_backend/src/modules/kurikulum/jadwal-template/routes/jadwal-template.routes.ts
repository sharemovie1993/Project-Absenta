import { jadwalTemplateController } from '../controllers/jadwal-template.controller';
import { allowBothModes } from '../../../../middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jadwalTemplateRoutes(fastify: any) {
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
      (req: any, reply: any) => jadwalTemplateController.list(req, reply),
    );
    router.get(
      '/my',
      {
        preHandler: [
          requireCapability('attendance.schedules.view.list'),
        ],
      },
      (req: any, reply: any) => jadwalTemplateController.listMySchedule(req, reply),
    );
    router.get(
      '/:id',
      {
        preHandler: [
          requireCapability('attendance.schedules.view.list'),
        ],
      },
      (req: any, reply: any) => jadwalTemplateController.getDetail(req, reply),
    );
    router.post(
      '/',
      {
        preHandler: [
          requireCapability('attendance.schedules.create'),
        ],
      },
      (req: any, reply: any) => jadwalTemplateController.create(req, reply),
    );
    router.put(
      '/:id',
      {
        preHandler: [
          requireCapability('attendance.schedules.update'),
        ],
      },
      (req: any, reply: any) => jadwalTemplateController.update(req, reply),
    );
    router.delete(
      '/:id',
      {
        preHandler: [
          requireCapability('attendance.schedules.delete'),
        ],
      },
      (req: any, reply: any) => jadwalTemplateController.delete(req, reply),
    );

    router.get(
      '/import/template',
      {
        preHandler: [requireCapability('attendance.schedules.create')],
      },
      (req: any, reply: any) => jadwalTemplateController.getImportTemplate(req, reply),
    );

    router.post(
      '/import',
      {
        preHandler: [requireCapability('attendance.schedules.create')],
      },
      (req: any, reply: any) => jadwalTemplateController.importFromExcel(req, reply),
    );
  });
}
