import { prisma } from '../../../utils/prisma';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';
import { randomBytes } from 'crypto';
import { DEFAULT_SUPPORT_EMAIL } from '@/utils/url-helper';
import { paymentConfig } from '../../../config/payment.config';
import { systemConfigService } from '../../system-config/services/system-config.service';


const darkHtml = (content: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Absensi</title><style>body{background:#2f353a;color:#e4e7ea;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol;margin:0;padding:24px} .card{max-width:720px;margin:40px auto;background:#3a4149;border:1px solid #23282c;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.35)} h3{margin:0 0 12px;font-size:18px} p{margin:8px 0} pre{background:#2f353a;border:1px solid #23282c;border-radius:8px;padding:12px;overflow:auto;color:#e4e7ea} a.button{display:inline-block;margin-top:12px;padding:8px 12px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none} .muted{color:#cbd1d6;font-size:12px}</style></head><body><div class="card">${content}<div class="muted">Absenta</div></div></body></html>`;

export async function registerPaymentPublicRoutes(fastify: any) {
  fastify.addHook('onRoute', (routeOptions: any) => {
    routeOptions.config = { ...(routeOptions.config || {}), skipAuth: true, public: true };
  });

  fastify.get('/public/:token/pay', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    }
  }, async (request: any, reply: any) => {
    try {
      const accept = String(request.headers['accept'] || '');
      const { token } = request.params || {};
      const t = String(token || '').trim();
      if (!t || t.length < 32) {
        if (accept.includes('application/json')) {
          reply.status(400);
          return { success: false, message: 'Invalid token' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(400);
          return darkHtml(`<h3>Token tidak valid</h3><p>Silakan minta tautan terbaru.</p>`);
        }
      }
      const mapping = await cacheService.get<{ invoice_id: string; tenant_id?: string; expiry?: number }>(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t));
      if (mapping?.expiry && Number.isFinite(mapping.expiry) && Date.now() > mapping.expiry) {
        await Promise.all([
          cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t)),
          mapping.invoice_id ? cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(mapping.invoice_id)) : Promise.resolve(),
        ]);
      }
      if (!mapping || !mapping.invoice_id) {
        if (accept.includes('application/json')) {
          reply.status(404);
          return { success: false, message: 'Invalid or expired token' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Tautan kedaluwarsa atau tidak valid</h3><p>Silakan minta tautan baru.</p>`);
        }
      }
      const invoice = await prisma.invoice.findUnique({
        where: { id: mapping.invoice_id },
        include: {
          Billing: {
            include: {
              Subscription: { include: { Tenant: true } }
            }
          }
        }
      });
      if (!invoice) {
        if (accept.includes('application/json')) {
          reply.status(404);
          return { success: false, message: 'Invoice not found' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Invoice tidak ditemukan</h3>`);
        }
      }
      if (invoice.status === 'PAID') {
        if (accept.includes('application/json')) {
          reply.status(200);
          return { success: true, message: 'Invoice already paid', data: { status: 'PAID' } };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(200);
          return darkHtml(`<h3>Invoice sudah lunas</h3>`);
        }
      }
      const billingId = invoice.billing_id;
      const amount = Number(invoice.total_amount || invoice.amount || 0);
      const tenant = (invoice as any)?.Billing?.Subscription?.Tenant;
      const { PaymentService } = await import('../services/payment.service');
      const paymentService = new PaymentService();
      const customerInfo = {
        firstName: (tenant?.name || 'Customer'),
        email: tenant?.email || DEFAULT_SUPPORT_EMAIL,
        phone: '',
      };
      const payment = await paymentService.createPayment({
        billingId,
        gateway: 'TRIPAY' as any,
        paymentMethod: 'QRIS' as any,
        amount,
        currency: 'IDR',
        customerInfo
      });
      if (payment.paymentUrl) {
        if (accept.includes('application/json')) {
          reply.status(200);
          return { success: true, message: 'Payment created', data: { payment_url: payment.paymentUrl, ref: payment.gatewayTransactionId, status: 'PENDING', superseded: !!(payment as any).superseded } };
        } else {
          reply.redirect(payment.paymentUrl);
          return;
        }
      }
      const qr = payment.qrString || '';
      if (accept.includes('application/json')) {
        reply.status(200);
        return { success: true, message: 'Payment created', data: { qr: qr, ref: payment.gatewayTransactionId, status: 'PENDING', superseded: !!(payment as any).superseded } };
      } else {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.status(200);
        return darkHtml(`<h3>Scan QR untuk bayar</h3><pre>${qr}</pre>`);
      }
    } catch (e: any) {
      const accept = String(request.headers['accept'] || '');
      if (accept.includes('application/json')) {
        reply.status(500);
        return { success: false, message: e?.message || 'Failed to create payment' };
      } else {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.status(500);
        return darkHtml(`<h3>Gagal membuat pembayaran</h3><p>${e?.message || 'Unknown error'}</p>`);
      }
    }
  });

  fastify.post('/public/:token/pay', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    }
  }, async (request: any, reply: any) => {
    try {
      const accept = String(request.headers['accept'] || '');
      const { token } = request.params || {};
      const t = String(token || '').trim();
      const body = request.body || {};
      if (!t || t.length < 32) {
        if (accept.includes('application/json')) {
          reply.status(400);
          return { success: false, message: 'Invalid token' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(400);
          return darkHtml(`<h3>Token tidak valid</h3><p>Silakan minta tautan terbaru.</p>`);
        }
      }
      const mapping = await cacheService.get<{ invoice_id: string; tenant_id?: string }>(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t));
      if (!mapping || !mapping.invoice_id) {
        if (accept.includes('application/json')) {
          reply.status(404);
          return { success: false, message: 'Invalid or expired token' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Tautan kedaluwarsa atau tidak valid</h3><p>Silakan minta tautan baru.</p>`);
        }
      }
      const invoice = await prisma.invoice.findUnique({
        where: { id: mapping.invoice_id },
        include: {
          Billing: {
            include: {
              Subscription: { include: { Tenant: true } }
            }
          }
        }
      });
      if (!invoice) {
        if (accept.includes('application/json')) {
          reply.status(404);
          return { success: false, message: 'Invoice not found' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Invoice tidak ditemukan</h3>`);
        }
      }
      if (invoice.status === 'PAID') {
        if (accept.includes('application/json')) {
          reply.status(200);
          return { success: true, message: 'Invoice already paid', data: { status: 'PAID' } };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(200);
          return darkHtml(`<h3>Invoice sudah lunas</h3>`);
        }
      }
      let allowedGatewayList: string[] = [];
      try {
        const { paymentConfig } = await import('../../../config/payment.config');
        if (paymentConfig.tripay.apiKey && paymentConfig.tripay.merchantCode) allowedGatewayList.push('TRIPAY');
        allowedGatewayList.push('MANUAL'); // Always allow manual as fallback
        if (allowedGatewayList.length === 0) allowedGatewayList = ['TRIPAY'];
      } catch {
        allowedGatewayList = ['TRIPAY', 'MANUAL'];
      }
      const allowedGateways = new Set(allowedGatewayList);
      const allowedMethods = new Set(['QRIS','BANK_TRANSFER','E_WALLET','CREDIT_CARD','DEBIT_CARD','CASH', 'MANUAL_TRANSFER']);
      const gateway = String(body.gateway || 'TRIPAY').toUpperCase();
      const method = String(body.method || 'QRIS').toUpperCase();
      const channelCode = String(body.channel_code || '').trim().toUpperCase();
      if (!allowedGateways.has(gateway) || !allowedMethods.has(method)) {
        if (accept.includes('application/json')) {
          reply.status(400);
          return { success: false, message: 'Unsupported gateway/method' };
        } else {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(400);
          return darkHtml(`<h3>Gateway/metode tidak didukung</h3>`);
        }
      }
      if (gateway === 'TRIPAY') {
        let allowedChannelCodes: string[] = [];
        try {
          const { PaymentService } = await import('../services/payment.service');
          const svc = new PaymentService();
          const channels = await svc.getTripayMerchantChannels();
          allowedChannelCodes = Array.isArray(channels) ? channels.map((c: any) => String(c.code || '').toUpperCase()).filter(Boolean) : [];
        } catch {}
        if (!channelCode || !allowedChannelCodes.includes(channelCode)) {
          if (accept.includes('application/json')) {
            reply.status(400);
            return { success: false, message: 'Invalid Tripay channel' };
          } else {
            reply.header('Content-Type', 'text/html; charset=utf-8');
            reply.status(400);
            return darkHtml(`<h3>Channel Tripay tidak valid</h3>`);
          }
        }
      }
      const amount = Number(invoice.total_amount || invoice.amount || 0);
      const tenant = (invoice as any)?.Billing?.Subscription?.Tenant;
      const tenantAdmin = await prisma.user.findFirst({
        where: { tenant_id: invoice.tenant_id, Role: { name: 'ADMIN' } },
        select: { email: true, full_name: true, no_hp: true }
      });
      const customerInfo = {
        firstName: String(body.name || tenantAdmin?.full_name || tenant?.name || 'Customer'),
        email: String(body.email || tenantAdmin?.email || tenant?.email || DEFAULT_SUPPORT_EMAIL),
        phone: String(body.phone || tenantAdmin?.no_hp || ''),
      };
      const { PaymentService } = await import('../services/payment.service');
      const paymentService = new PaymentService();
      const payment = await paymentService.createPayment({
        billingId: invoice.billing_id,
        gateway: gateway as any,
        paymentMethod: method as any,
        amount,
        currency: 'IDR',
        channelCode: channelCode || undefined,
        customerInfo
      });
      if (payment.paymentUrl) {
        if (accept.includes('application/json')) {
          reply.status(200);
          return { success: true, message: 'Payment created', data: { payment_url: payment.paymentUrl, ref: payment.gatewayTransactionId, status: 'PENDING', superseded: !!(payment as any).superseded } };
        } else {
          reply.redirect(payment.paymentUrl);
          return;
        }
      }
      const qr = payment.qrString || '';
      if (accept.includes('application/json')) {
        reply.status(200);
        return { success: true, message: 'Payment created', data: { qr: qr, ref: payment.gatewayTransactionId, status: 'PENDING', superseded: !!(payment as any).superseded } };
      } else {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.status(200);
        return darkHtml(`<h3>Scan QR untuk bayar</h3><pre>${qr}</pre>`);
      }
    } catch (e: any) {
      const accept = String(request.headers['accept'] || '');
      if (accept.includes('application/json')) {
        reply.status(500);
        return { success: false, message: e?.message || 'Failed to process payment' };
      } else {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.status(500);
        return darkHtml(`<h3>Gagal memproses pembayaran</h3><p>${e?.message || 'Unknown error'}</p>`);
      }
    }
  });

  fastify.get('/return', async (request: any, reply: any) => {
    try {
      const gateway = String((request.query || {}).gateway || '').toUpperCase();
      const ref = String((request.query || {}).ref || '');
      const msgTitle = gateway ? `Kembali dari ${gateway}` : 'Kembali dari pembayaran';
      const content = `<h3>${msgTitle}</h3><p>Referensi: ${ref || '-'}</p><p>Kami sedang menunggu konfirmasi dari gateway. Halaman ini akan memeriksa status pembayaran secara berkala.</p><script>async function poll(){try{const r=await fetch('/payment/public/status?ref=${encodeURIComponent(ref)}',{headers:{Accept:'application/json'}});if(r.ok){const j=await r.json();if(j&&j.data&&j.data.status){const s=String(j.data.status).toUpperCase();document.body.querySelector('.muted').textContent='Status: '+s;if(['SUCCESS','PAID','SETTLEMENT'].includes(s)){document.body.querySelector('.muted').textContent='Status: PAID';}}}}catch(e){}finally{setTimeout(poll,3000)}}poll();</script>`;
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.status(200);
      return darkHtml(content);
    } catch {
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.status(500);
      return darkHtml(`<h3>Gagal memuat halaman pengembalian</h3>`);
    }
  });

  fastify.get('/public/status', async (request: any, reply: any) => {
    try {
      const q = (request.query || {}) as any;
      const ref = String(q.ref || q.reference || q.merchant_ref || q.merchantRef || '');
      if (!ref) {
        reply.status(400);
        return { success: false, message: 'Missing ref' };
      }
      const refTrim = String(ref || '').trim();
      const select = { 
        id: true, 
        tenant_id: true,
        status: true, 
        billing_id: true, 
        gateway: true, 
        payment_method: true,
        amount: true,
        currency: true,
        created_at: true, 
        paid_at: true, 
        expired_at: true,
        gateway_payment_url: true,
        gateway_qr_string: true,
        gateway_response: true 
      };

      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

      let payment: any = await prisma.payment.findFirst({
        where: { gateway_transaction_id: refTrim },
        select
      });
      if (!payment && isUuid(refTrim)) {
        payment = await prisma.payment.findUnique({
          where: { id: refTrim },
          select
        });
      }
      if (!payment) {
        try {
          payment = await prisma.payment.findFirst({
            where: {
              OR: [
                { gateway_response: { path: ['data', 'reference'], equals: refTrim } as any },
                { gateway_response: { path: ['data', 'merchant_ref'], equals: refTrim } as any },
                { gateway_response: { path: ['reference'], equals: refTrim } as any },
                { gateway_response: { path: ['merchant_ref'], equals: refTrim } as any },
                { gateway_response: { path: ['data', 'transaction_id'], equals: refTrim } as any },
              ]
            },
            select,
            orderBy: { created_at: 'desc' }
          });
        } catch {}
      }
      if (!payment) {
        reply.status(404);
        return { success: false, message: 'Payment not found' };
      }

      let invoiceToken = null;
      if (payment.billing_id) {
         const invoice = await prisma.invoice.findUnique({
            where: { billing_id: payment.billing_id },
            select: { id: true, tenant_id: true }
         });
         if (invoice) {
             invoiceToken = await cacheService.get(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoice.id));
             if (!invoiceToken) {
                 invoiceToken = randomBytes(32).toString('hex');
                 const ttl = (() => {
                   const envTtl = parseInt(String(process.env.INVOICE_PUBLIC_LINK_TTL_SECONDS || '').trim() || '');
                   return Number.isFinite(envTtl) && envTtl > 0 ? envTtl : (7 * 24 * 60 * 60);
                 })();
                 const expiry = Date.now() + ttl * 1000;
                 await Promise.all([
                    cacheService.set(
                      CACHE_KEYS.INVOICE.PUBLIC_TOKEN(invoiceToken),
                      { invoice_id: invoice.id, tenant_id: invoice.tenant_id, created_at: Date.now(), expiry },
                      ttl
                    ),
                    cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(invoice.id), invoiceToken, ttl)
                 ]);
             }
         }
      }

      let payCode = null;
      let instructions: any[] = [];
      let qrUrl = null;
      let expiredAtStr = payment.expired_at ? payment.expired_at.toISOString() : null;

      if (payment.gateway_response) {
        const raw = payment.gateway_response as any;
        const gateway = raw?.data || raw || {};

        if (gateway.pay_code || gateway.payment_code) {
          payCode = gateway.pay_code || gateway.payment_code;
        }

        if (Array.isArray(gateway.instructions)) {
          instructions = gateway.instructions;
        }

        if (gateway.qr_url) {
          qrUrl = gateway.qr_url;
        }

        if (gateway.expired_time) {
          try {
            expiredAtStr = new Date(gateway.expired_time * 1000).toISOString();
          } catch (e) {}
        }
      }

      const tenantConfig = await systemConfigService.getActive(payment.tenant_id);
      const manualPayment = {
        ...(paymentConfig.manual || {}),
        bankName: (tenantConfig as any)?.company_bank_name || paymentConfig.manual?.bankName || 'BANK MANDIRI',
        accountNumber: (tenantConfig as any)?.company_bank_account || paymentConfig.manual?.accountNumber || '1234567890',
        accountHolder: (tenantConfig as any)?.company_bank_holder || paymentConfig.manual?.accountHolder || 'PT BARAYA TEKNOLOGI INDONESIA'
      };

      reply.status(200);
      return { 
        success: true, 
        message: 'OK', 
        data: { 
          id: payment.id, 
          status: payment.status, 
          billing_id: payment.billing_id, 
          gateway: payment.gateway,
          payment_method: payment.payment_method,
          amount: payment.amount,
          currency: payment.currency,
          created_at: payment.created_at, 
          paid_at: payment.paid_at, 
          expired_at: payment.expired_at,
          payment_url: payment.gateway_payment_url,
          qr_string: payment.gateway_qr_string,
          gateway_response: payment.gateway_response,
          invoice_token: invoiceToken,
          payCode,
          instructions,
          qrUrl,
          expiredAt: expiredAtStr,
          manual_payment: manualPayment
        } 
      };
    } catch (e: any) {
      reply.status(500);
      return { success: false, message: e?.message || 'Failed to get status' };
    }
  });

  fastify.post('/public/proof/:paymentId', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, async (request: any, reply: any) => {
    const { PaymentController } = await import('../controllers/payment.controller');
    const controller = new PaymentController();
    return await controller.submitProofOfPayment(request, reply);
  });
}
