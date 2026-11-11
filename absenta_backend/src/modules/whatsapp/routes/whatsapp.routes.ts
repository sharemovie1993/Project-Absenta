import { WhatsappController } from '../controllers/whatsapp.controller';
import { waWebhookController } from '../controllers/wa-webhook.controller';
import { waChatLogController } from '../controllers/wa-chat-log.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';
import { RoleName } from '../../../constants/enums';

/**
 * Mengizinkan seluruh staf/operator/guru/pimpinan sekolah terautentikasi (non-SISWA)
 * mengirim dokumen resmi hasil Universal Document Printing via WhatsApp Gateway sekolah.
 */
const requireStaffDocumentSender = async (request: any, reply: any) => {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
  const roleName = String(user.roleName || user.Role?.name || '').trim().toUpperCase();
  if (roleName === RoleName.SISWA) {
    return reply.status(403).send({
      code: 'FORBIDDEN',
      message: 'Siswa tidak diizinkan mengirim dokumen melalui WhatsApp Gateway sekolah.',
    });
  }
};

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

  // GET /whatsapp/document-targets - Status WA & daftar grup untuk modal kirim dokumen Universal Printing
  fastify.get('/document-targets', {
    preHandler: [requireStaffDocumentSender, determineDataScope()],
    handler: whatsappController.getDocumentTargets.bind(whatsappController),
  });

  // POST/GET /whatsapp/user-session/* - Tautkan / cek status / putuskan sesi WA pribadi user yang sedang login
  fastify.post('/user-session/connect', {
    preHandler: [requireStaffDocumentSender, determineDataScope()],
    handler: whatsappController.connectUserSession.bind(whatsappController),
  });
  fastify.get('/user-session/status', {
    preHandler: [requireStaffDocumentSender, determineDataScope()],
    handler: whatsappController.getUserSessionStatus.bind(whatsappController),
  });
  fastify.post('/user-session/disconnect', {
    preHandler: [requireStaffDocumentSender, determineDataScope()],
    handler: whatsappController.disconnectUserSession.bind(whatsappController),
  });

  // GET /whatsapp/document-recipients - Direktori nomor WA biodata Guru, Siswa & Orang Tua/Wali
  fastify.get('/document-recipients', {
    preHandler: [requireStaffDocumentSender, determineDataScope()],
    handler: whatsappController.getDocumentRecipients.bind(whatsappController),
  });

  // POST /whatsapp/send-document - Kirim file PDF/dokumen Universal Document Printing ke nomor WA / Grup WA
  fastify.post('/send-document', {
    preHandler: [requireStaffDocumentSender, determineDataScope()],
    handler: whatsappController.sendDocument.bind(whatsappController),
  });
}

