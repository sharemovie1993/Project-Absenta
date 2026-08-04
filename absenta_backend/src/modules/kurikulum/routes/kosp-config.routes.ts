import { KospConfigController } from '../controllers/kosp-config.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function kospConfigRoutes(fastify: any) {
  fastify.get('/kosp-config', {
    preHandler: requireCapability(['academic.structure.manage', 'academic.structures.view.list'])
  }, KospConfigController.getByTahun);

  fastify.put('/kosp-config', {
    preHandler: requireCapability('academic.structure.manage')
  }, KospConfigController.upsert);
}
