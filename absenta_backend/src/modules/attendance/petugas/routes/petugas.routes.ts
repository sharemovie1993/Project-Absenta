import { petugasController } from '../controllers/petugas.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function petugasRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability('attendance.officers.view'),
        determineDataScope()
      ]
    },
    petugasController.getAll
  );

  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability('attendance.officers.manage'),
        determineDataScope()
      ]
    },
    petugasController.assign
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability('attendance.officers.manage'),
        determineDataScope()
      ]
    },
    petugasController.unassign
  );
}
