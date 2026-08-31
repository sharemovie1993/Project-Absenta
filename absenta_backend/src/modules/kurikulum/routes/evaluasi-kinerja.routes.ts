import { EvaluasiKinerjaController } from '../controllers/evaluasi-kinerja.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '../../../middlewares/dataScope';

export async function evaluasiKinerjaRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability(['curriculum.supervision.manage', 'academic.teaching.view', 'academic.manage.academic', 'dashboard.view.overview']),
        determineDataScope(),
      ],
    },
    EvaluasiKinerjaController.getAll
  );

  fastify.get(
    '/:guruId',
    {
      preHandler: [
        requireCapability(['curriculum.supervision.manage', 'academic.teaching.view', 'academic.manage.academic']),
        determineDataScope(),
      ],
    },
    EvaluasiKinerjaController.getDetailByGuruId
  );
}

export default evaluasiKinerjaRoutes;
