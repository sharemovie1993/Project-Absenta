import { billingSettingsController } from '../controllers/billing-settings.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function billingSettingsRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('core.system.config.view')],
    handler: billingSettingsController.getSettings.bind(billingSettingsController),
  });

  fastify.put('/', {
    preHandler: [requireCapability('core.system.config.update')],
    handler: billingSettingsController.updateSettings.bind(billingSettingsController),
  });

  fastify.post('/reset', {
    preHandler: [requireCapability('core.system.config.update')],
    handler: billingSettingsController.resetSettings.bind(billingSettingsController),
  });

  fastify.post('/test-gateway', {
    preHandler: [requireCapability('core.system.config.update')],
    handler: billingSettingsController.testGateway.bind(billingSettingsController),
  });

  fastify.get('/defaults', {
    preHandler: [requireCapability('core.system.config.view')],
    handler: billingSettingsController.getDefaults.bind(billingSettingsController),
  });
}
