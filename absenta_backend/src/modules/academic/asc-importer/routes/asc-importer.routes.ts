import { AscImporterController } from '../controllers/asc-importer.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function ascImporterRoutes(fastify: any) {
  fastify.post(
    '/analyze',
    {
      preHandler: [
        requireCapability(['academic.schedules.create', 'academic.schedules.manage', 'curriculum.structure.manage']),
        determineDataScope(),
      ],
    },
    AscImporterController.analyze
  );

  fastify.post(
    '/execute',
    {
      preHandler: [
        requireCapability(['academic.schedules.create', 'academic.schedules.manage', 'curriculum.structure.manage']),
        determineDataScope(),
      ],
    },
    AscImporterController.execute
  );
}
