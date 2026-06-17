import { WhatsappController } from '../controllers/whatsapp.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

const whatsappController = new WhatsappController();

export async function whatsappRoutes(fastify: any) {
  // GET /whatsapp/config - Get current config
  fastify.get('/config', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.getConfig.bind(whatsappController),
  });

  // POST /whatsapp/config - Save config
  fastify.post('/config', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.saveConfig.bind(whatsappController),
  });

  // POST /whatsapp/test - Test connection
  fastify.post('/test', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.testConnection.bind(whatsappController),
  });
}
