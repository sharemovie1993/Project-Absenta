import { billingSettingsController } from '../controllers/billing-settings.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function billingSettingsRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('core.system.config.view'), determineDataScope()],
    handler: billingSettingsController.getSettings.bind(billingSettingsController),
  });

  fastify.put('/', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: billingSettingsController.updateSettings.bind(billingSettingsController),
  });

  fastify.post('/reset', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: billingSettingsController.resetSettings.bind(billingSettingsController),
  });

  fastify.post('/test-gateway', {
    preHandler: [requireCapability('core.system.config.update'), determineDataScope()],
    handler: billingSettingsController.testGateway.bind(billingSettingsController),
  });

  fastify.get('/defaults', {
    preHandler: [requireCapability('core.system.config.view'), determineDataScope()],
    handler: billingSettingsController.getDefaults.bind(billingSettingsController),
  });
}
