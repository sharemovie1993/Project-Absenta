import { WhatsappController } from '../controllers/whatsapp.controller';
import { waWebhookController } from '../controllers/wa-webhook.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

const whatsappController = new WhatsappController();

export async function whatsappRoutes(fastify: any) {
  // POST /whatsapp/webhook - Public Webhook Inbound WA Chatbot
  fastify.post('/webhook', {
    handler: waWebhookController.handleInboundWebhook.bind(waWebhookController),
  });

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

  // POST /whatsapp/connect - Connect local WhatsApp session
  fastify.post('/connect', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.connectLocal.bind(whatsappController),
  });

  // POST /whatsapp/disconnect - Disconnect local WhatsApp session
  fastify.post('/disconnect', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.disconnectLocal.bind(whatsappController),
  });

  // GET /whatsapp/status - Get status of local connection
  fastify.get('/status', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.getLocalStatus.bind(whatsappController),
  });

  // GET /whatsapp/qr - Get QR code for local gateway connection
  fastify.get('/qr', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.getLocalQR.bind(whatsappController),
  });
}
