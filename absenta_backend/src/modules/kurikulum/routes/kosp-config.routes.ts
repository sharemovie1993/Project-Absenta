import { KospConfigController } from '../controllers/kosp-config.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function kospConfigRoutes(fastify: any) {
  fastify.get('/kosp-config', {
    preHandler: [requireCapability(['academic.structure.manage', 'academic.structures.view.list']), determineDataScope()]
  }, KospConfigController.getByTahun);

  fastify.put('/kosp-config', {
    preHandler: [requireCapability('academic.structure.manage'), determineDataScope()]
  }, KospConfigController.upsert);
}
