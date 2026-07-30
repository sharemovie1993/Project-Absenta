import { waChatbotResolverService } from '../services/wa-chatbot-resolver.service';
import { WhatsAppService } from '@/modules/notification/services/whatsapp.service';

export class WaWebhookController {
  /**
   * Fastify handler untuk POST /api/whatsapp/webhook
   * Menerima event pesan masuk dari Provider Fonnte / Baileys Gateway
   */
  async handleInboundWebhook(req: any, reply: any) {
    try {
      const body = (req.body || {}) as any;

      // Extract sender phone number & message text (support Fonnte & generic formats)
      const senderPhone = String(body.sender || body.from || body.phone || '').trim();
      const messageText = String(body.message || body.text || body.body || '').trim();
      const tenantId = body.tenant_id ? String(body.tenant_id).trim() : null;

      if (!senderPhone) {
        return reply.status(400).send({
          success: false,
          error: 'Parameter sender/from/phone wajib diisi',
        });
      }

      // Skip Channel WA (@newsletter), Group (@g.us), Broadcast (@broadcast)
      const senderLower = senderPhone.toLowerCase();
      const isGroup = body.is_group === true || body.isGroup === true || senderLower.includes('@g.us');
      const isChannel = body.is_channel === true || body.isChannel === true || senderLower.includes('@newsletter') || senderLower.includes('newsletter') || senderLower.includes('channel');
      const isBroadcast = body.is_broadcast === true || senderLower.includes('@broadcast');

      if (isGroup || isChannel || isBroadcast) {
        console.log(`[WA-Webhook] Ignored non-DM message from Channel/Group/Broadcast: ${senderPhone}`);
        return reply.send({ success: true, ignored: true });
      }

      // Process message using Resolver Service
      const replyText = await waChatbotResolverService.processIncomingMessage(senderPhone, messageText);
      if (!replyText) {
        return reply.send({ success: true, ignored: true });
      }

      // Send reply back via WhatsAppService if requested/configured
      if (body.auto_reply !== false) {
        try {
          const waService = new WhatsAppService();
          await waService.sendWhatsApp({
            phoneNumber: senderPhone,
            message: replyText,
            tenantId: tenantId,
            bypassThrottleQuiet: true,
            event: 'CHATBOT_REPLY',
          });
        } catch (e: any) {
          console.warn('[WA-Webhook] Failed to dispatch auto reply via WA gateway:', e.message);
        }
      }

      return reply.send({
        success: true,
        sender: senderPhone,
        message: messageText,
        reply: replyText,
      });
    } catch (error: any) {
      console.error('[WA-Webhook] Error processing inbound webhook:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Gagal memproses pesan WA chatbot',
      });
    }
  }
}

export const waWebhookController = new WaWebhookController();
