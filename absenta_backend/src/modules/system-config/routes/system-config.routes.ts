import { requireCapability } from '../../../middlewares/requireCapability';
import { systemConfigController } from '../controllers/system-config.controller';

export async function systemConfigRoutes(fastify: any) {
  // GET /api/system/config
  fastify.get('/', {
    config: { skipAuth: true, public: true },
    handler: systemConfigController.getActive.bind(systemConfigController),
  });

  // POST /api/system/config
  // PUT /api/system/config
  fastify.post('/', {
    preHandler: [requireCapability('core.system.config.update')],
    handler: systemConfigController.upsert.bind(systemConfigController),
  });
  fastify.put('/', {
    preHandler: [requireCapability('core.system.config.update')],
    handler: systemConfigController.upsert.bind(systemConfigController),
  });
}
