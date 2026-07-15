import { RekapKBMController } from '../controllers/rekap-kbm.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '../../../middlewares/dataScope';

export async function rekapKBMRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability(['academic.teaching.rekap', 'academic.structure.manage']),
        determineDataScope()
      ]
    },
    RekapKBMController.getAll
  );
}
