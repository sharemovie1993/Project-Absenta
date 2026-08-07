import { WhatsappController } from '../controllers/whatsapp.controller';
import { waWebhookController } from '../controllers/wa-webhook.controller';
import { waChatLogController } from '../controllers/wa-chat-log.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

const whatsappController = new WhatsappController();

export async function whatsappRoutes(fastify: any) {
  // POST /whatsapp/webhook - Public Webhook Inbound WA Chatbot
  fastify.post('/webhook', {
    handler: waWebhookController.handleInboundWebhook.bind(waWebhookController),
  });

  // GET /whatsapp/chat-logs - Daftar kontak unik chatbot
  fastify.get('/chat-logs', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: waChatLogController.listContacts.bind(waChatLogController),
  });

  // GET /whatsapp/chat-logs/:phone - Riwayat percakapan per nomor HP
  fastify.get('/chat-logs/:phone', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: waChatLogController.getChatDetail.bind(waChatLogController),
  });

  // ── ONBOARDING & BROADCAST SAPAAN WA ──────────────────────────────────────────
  // GET /whatsapp/onboarding-users - Daftar Guru/Siswa/Ortu & status komunikasi WA Bot
  fastify.get('/onboarding-users', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: (req: any, reply: any) => {
      const { waOnboardingController } = require('../controllers/wa-onboarding.controller');
      return waOnboardingController.getOnboardingUsers(req, reply);
    },
  });

  // POST /whatsapp/send-greeting - Kirim pesan sapaan ke 1 pengguna
  fastify.post('/send-greeting', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: (req: any, reply: any) => {
      const { waOnboardingController } = require('../controllers/wa-onboarding.controller');
      return waOnboardingController.sendGreeting(req, reply);
    },
  });

  // POST /whatsapp/send-greeting-bulk - Kirim pesan sapaan masif ke pengguna yang belum komunikasi
  fastify.post('/send-greeting-bulk', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: (req: any, reply: any) => {
      const { waOnboardingController } = require('../controllers/wa-onboarding.controller');
      return waOnboardingController.sendGreetingBulk(req, reply);
    },
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

  // GET /whatsapp/groups - Get list of WA groups participated by linked number
  // Query: ?refresh=true → paksa bypass Redis cache dan fetch ulang dari WA server
  fastify.get('/groups', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.getGroups.bind(whatsappController),
  });

  // DELETE /whatsapp/groups/cache - Hapus cache daftar grup WA dari Redis
  fastify.delete('/groups/cache', {
    preHandler: [requireCapability('whatsapp.manage.config'), determineDataScope()],
    handler: whatsappController.invalidateGroupsCache.bind(whatsappController),
  });
}

