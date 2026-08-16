import { tenantMiddleware } from '../middlewares/tenant';
import { capabilityGuard } from '../plugins/capability.guard';
import { serviceFeatureGuard } from './guards/service-feature.guard';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function registerRoutes(fastify: any, prisma: any) {
  fastify.all('/auth/*', {
    config: { skipAuth: true, public: true },
  }, async (_request: any, reply: any) => {
    reply.status(410).send({
      statusCode: 410,
      error: 'Gone',
      message: 'deprecated endpoint. Use /api prefix.'
    });
  });

  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  });

  fastify.get('/internal/events/metrics', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
  }, async (request: any, reply: any) => {
    const secret = String(process.env.INTERNAL_METRICS_SECRET || '').trim();
    if (secret) {
      const headerSecret = String((request.headers as any)?.['x-internal-secret'] || '').trim();
      if (headerSecret !== secret) {
        reply.status(403);
        return { success: false, message: 'Forbidden' };
      }
    }

    const { getAttendanceQueue, getAttendanceDlqQueue } = await import('../queues/attendance.queue');
    const { getBillingQueue, getBillingDlqQueue } = await import('../queues/billing.queue');
    const { getNotificationQueue: getNotificationGeneralQueue, getNotificationDlqQueue } = await import('../queues/notification.queue');
    const { getEmailQueue } = await import('../queue/email.queue');
    const { getNotificationQueue: getParentNotificationQueue } = await import('../modules/notification/notification.queue');
    const { getRecurringQueue } = await import('../queues/recurring.queue');

    const summarize = async (q: any) => {
      try {
        const c = await q.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
        const backlog = Number(c.waiting || 0) + Number(c.active || 0) + Number(c.delayed || 0);
        return { ...c, backlog };
      } catch (e: any) {
        return { error: String(e?.message || e || 'error') };
      }
    };

    const attendance = getAttendanceQueue();
    const billing = getBillingQueue();
    const notification = getNotificationGeneralQueue();
    const recurring = getRecurringQueue();
    const emailQueue = getEmailQueue();
    const parentNotification = getParentNotificationQueue();

    const attendanceDlq = getAttendanceDlqQueue();
    const billingDlq = getBillingDlqQueue();
    const notificationDlq = getNotificationDlqQueue();

    return {
      success: true,
      timestamp: new Date().toISOString(),
      queues: {
        attendance: await summarize(attendance),
        billing: await summarize(billing),
        notification: await summarize(notification),
        recurring: await summarize(recurring),
        emailQueue: await summarize(emailQueue),
        parentNotification: await summarize(parentNotification),
        attendance_dlq: await summarize(attendanceDlq),
        billing_dlq: await summarize(billingDlq),
        notification_dlq: await summarize(notificationDlq),
      },
    };
  });

  fastify.get('/db-test', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
  }, async (_: any, reply: any) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.status(500);
      return {
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  });


  await fastify.register(async function (fastify: any) {
    const DEBUG = String(process.env.ENABLE_DEBUG_LOGS || '').toLowerCase() === 'true';
    if (DEBUG) console.log('Registering API plugin with middleware...');
    if (DEBUG) {
      fastify.addHook('onRequest', async (request: any) => {
        console.log(`[API Plugin] Request: ${request.method} ${request.url}`);
      });
    }
    if (DEBUG) console.log('Registering cache invalidation + realtime middleware...');

    // API routes (prefixed with /api)
    await fastify.register(async function apiRoutes(fastify: any) {
      
      // Parent App routes
      await fastify.register(async function parentApi(fastify: any) {
        fastify.addHook('preHandler', async (request: any, reply: any) => {
          if (DEBUG) console.log('TENANT preHandler hook called for (parent):', request.method, request.url);
          return tenantMiddleware(request, reply);
        });

        const { parentAppRoutes } = await import('../modules/parent-app/routes/parent-app.routes');
        await fastify.register(parentAppRoutes);
      }, { prefix: '/parent-app' });

      // --- PUBLIC API ROUTES ---
      await fastify.register(async function publicApi(fastify: any) {
        const { sekolahRoutes } = await import('../modules/sekolah/routes/sekolah.routes');
        await fastify.register(sekolahRoutes, { prefix: '/sekolah' });

        const { authRoutes } = await import('../modules/auth/routes/auth.routes');
        await fastify.register(authRoutes, { prefix: '/auth' });

        const { wilayahRoutes } = await import('../modules/wilayah/routes/wilayah.routes');
        await fastify.register(wilayahRoutes, { prefix: '/wilayah' });

        // Public Kalender iCal Export (Sync for Google/Apple Calendar)
        fastify.get('/kurikulum/kalender/export', async (request: any, reply: any) => {
          const { KalenderAkademikController } = await import('../modules/kurikulum/controllers/kalender-akademik.controller');
          return KalenderAkademikController.exportICal(request, reply);
        });

        // Public route for viewing central invoice details on the public payment page
        fastify.get('/invoice/public/:token', async (request: any, reply: any) => {
          const { token } = request.params;
          const axios = require('axios');
          const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
          const coreKey = process.env.LICENSE_KEY || '';
          try {
            const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`, { timeout: 8000 });
            if (response.data?.success && response.data?.data?.invoices) {
              const inv = response.data.data.invoices.find((i: any) => i.invoice_number === token);
              if (inv) {
                const mappedStatus = String(inv.status).toUpperCase();
                let status = 'SENT';
                if (mappedStatus === 'PAID') status = 'PAID';
                else if (mappedStatus === 'CANCELLED') status = 'CANCELLED';
                else if (mappedStatus === 'EXPIRED') status = 'OVERDUE';

                const total_amount = inv.amount;

                let instructions = [];
                try {
                  instructions = typeof inv.payment_instructions === 'string'
                    ? JSON.parse(inv.payment_instructions)
                    : (inv.payment_instructions || []);
                } catch {
                  instructions = [];
                }

                if (instructions.length === 0 && inv.pay_code) {
                  instructions = [{
                    title: `Bayar via ${inv.payment_method || 'Virtual Account'}`,
                    steps: [
                      `Gunakan nomor Virtual Account / Kode Bayar: <strong>${inv.pay_code}</strong>`,
                      `Transfer nominal persis: <strong>Rp ${total_amount.toLocaleString('id-ID')}</strong>`,
                      `Status pembayaran akan terkonfirmasi otomatis setelah transfer diterima.`
                    ]
                  }];
                }

                return reply.send({
                  success: true,
                  message: 'Invoice found',
                  gateways: [inv.payment_method || 'TRIPAY'],
                  tripay_channels: [
                    {
                      code: inv.payment_method === 'Manual' ? 'MANUAL_TRANSFER' : (inv.pay_code ? 'VA' : 'QRIS'),
                      name: inv.payment_method || 'QRIS / Virtual Account',
                      group: inv.payment_method || 'Online Payment',
                      icon_url: inv.qr_url || 'https://img.icons8.com/fluency/96/qr-code.png'
                    }
                  ],
                  manual_payment: {
                    bankName: 'Mandiri / BCA',
                    bankAccount: '1234567890',
                    accountHolder: 'Cakola License'
                  },
                  data: {
                    id: String(inv.invoice_number),
                    invoice_number: inv.invoice_number,
                    amount: inv.amount,
                    total_amount: total_amount,
                    currency: 'IDR',
                    status: status,
                    due_date: inv.expired_time 
                      ? (typeof inv.expired_time === 'number' || !isNaN(Number(inv.expired_time))
                          ? new Date(Number(inv.expired_time) * 1000).toISOString()
                          : inv.expired_time)
                      : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                    created_at: inv.created_at,
                    notes: inv.plan_title || 'Layanan Cakola Premium',
                    active_transaction: inv.paid_at ? null : {
                      status: 'PENDING',
                      reference: inv.payment_reference || '',
                      payment_method: inv.payment_method || 'TRIPAY',
                      pay_code: inv.pay_code || '',
                      qr_url: inv.qr_url || '',
                      instructions: instructions
                    }
                  }
                });
              }
            }
          } catch (err: any) {
            console.error('[Public invoice details proxy failed]:', err.message);
          }
          return reply.status(404).send({ success: false, message: 'Tagihan tidak ditemukan atau sudah kedaluwarsa.' });
        });
      });

      // Protected API routes (user/admin/etc) with auth + tenant middleware
      await fastify.register(async function protectedApi(fastify: any) {
      if (DEBUG) console.log('Registering tenantMiddleware for protected API...');

      // Tenant Middleware (Relies on request.user for SUPERADMIN bypass)
      fastify.addHook('preHandler', async (request: any, reply: any) => {
        if (DEBUG) console.log('TENANT preHandler hook called for:', request.method, request.url);
        return tenantMiddleware(request, reply);
      });

      fastify.addHook('onRoute', (routeOptions: any) => {
        const url = String(routeOptions?.url || '');
        if (
          url.startsWith('/billing') ||
          url.startsWith('/subscriptions')
        ) {
          routeOptions.config = { ...(routeOptions.config || {}), billing: true };
        }
      });

      await fastify.register(serviceFeatureGuard);

      // Capability Guard (Checks tenant features)
      await fastify.register(capabilityGuard);

      fastify.addHook('preHandler', organizationalScopeMiddleware);
      
      if (DEBUG) {
        console.log('All middleware hooks registered for protected API routes');
        console.log('Fastify hooks after middleware registration (protected):', Object.keys((fastify as any)._hooks || {}));
      }

      // (Moved authRoutes to public block above)

      const { userRoutes } = await import('../modules/user/routes/user.routes');
      await fastify.register(userRoutes, { prefix: '/users' });

      const { activityLogRoutes } = await import('../modules/activity/routes/activity-log.routes');
      await fastify.register(activityLogRoutes, { prefix: '/activity-logs' });

      const { jobdeskRoutes } = await import('../modules/jobdesk/routes/jobdesk.routes');
      await fastify.register(jobdeskRoutes, { prefix: '/jobdesk' });

      fastify.get('/roles', {
        preHandler: [requireCapability('core.users.view.roles')],
        handler: async (request: any, reply: any) => {
          const { userController } = await import('../modules/user/controllers/user.controller');
          return userController.getRoles(request, reply);
        }
      });

      const { tenantRoutes } = await import('../modules/tenant/routes/tenant.routes');
      await fastify.register(tenantRoutes, { prefix: '/tenants' });

      fastify.get('/me/tenant', {
        preHandler: [requireCapability('core.sekolah.view.profile')],
        handler: async (request: any, reply: any) => {
          const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id ?? null;
          if (!tenantId) {
            return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan', data: null });
          }

          const { tenantService } = await import('../modules/tenant/services/tenant.service');
          const dataScope = request.dataScope || { tenantId };
          try {
            const tenant = await tenantService.getTenantById(dataScope, tenantId);
            return reply.status(200).send({ success: true, message: 'Tenant retrieved successfully', data: tenant });
          } catch (e: any) {
            return reply.status(404).send({ success: false, message: e.message || 'Tenant tidak ditemukan', data: null });
          }
        },
      });

      fastify.get('/me/subscription', {
        preHandler: [requireCapability('billing.my.subscription.view')],
        handler: async (request: any, reply: any) => {
          const { mySubscriptionController } = await import('../modules/billing/controllers/my-subscription.controller');
          return mySubscriptionController.getSubscription(request, reply);
        },
      });

      const { academicRoutes } = await import('../modules/academic/routes/academic.routes');
      await fastify.register(academicRoutes, { prefix: '/academic' });

      const { backupRoutes } = await import('../modules/backup/routes/backup.routes');
      await fastify.register(backupRoutes);

      const { dashboardRoutes } = await import('../modules/dashboard/routes/dashboard.routes');
      await fastify.register(dashboardRoutes, { prefix: '/dashboard' });

      const { planRoutes } = await import('../modules/billing/routes/plan.routes');
      const { moduleRoutes } = await import('../modules/billing/routes/module.routes');
      const { subscriptionRoutes } = await import('../modules/billing/routes/subscription.routes');
      const { subscriptionCheckRoutes } = await import('../modules/billing/routes/subscription-check.routes');
      const { mySubscriptionRoutes } = await import('../modules/billing/routes/my-subscription.routes');
      await fastify.register(planRoutes, { prefix: '/billing/plans' });
      await fastify.register(moduleRoutes, { prefix: '/billing/modules' });
      await fastify.register(subscriptionRoutes, { prefix: '/billing/subscriptions' });
      await fastify.register(mySubscriptionRoutes, { prefix: '/billing/my-subscription' });

      // Fallback route for /invoice/:invoiceId/public-link to resolve central license server links
      fastify.get('/invoice/:invoiceId/public-link', {
        preHandler: [requireCapability('billing.my.subscription.view')]
      }, async (request: any, reply: any) => {
        const { invoiceId } = request.params;
        const axios = require('axios');
        const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
        const coreKey = process.env.LICENSE_KEY || '';
        try {
          const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`, { timeout: 8000 });
          if (response.data?.success && response.data?.data?.invoices) {
            const inv = response.data.data.invoices.find((i: any) => i.invoice_number === invoiceId);
            if (inv) {
              const url = inv.status === 'paid' 
                ? `${LICENSE_SERVER_URL}/api/license/print-invoice/${invoiceId}`
                : (inv.qr_url || `${LICENSE_SERVER_URL}/api/license/print-invoice/${invoiceId}`);
              
              return reply.send({
                success: true,
                message: 'Invoice link resolved',
                data: {
                  url: url,
                  token: null
                }
              });
            }
          }
        } catch (err: any) {
          console.error('[Fallback public-link route] Failed to resolve:', err.message);
        }
        return reply.status(404).send({ success: false, message: 'Invoice tidak ditemukan di Server Lisensi.' });
      });

      // Proxy route to fetch active Tripay payment channels from the Server Lisensi centrally
      fastify.get('/billing/payment-channels', {
        preHandler: [requireCapability('billing.my.subscription.view')]
      }, async (request: any, reply: any) => {
        const axios = require('axios');
        const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
        const productId = request.query?.productId || request.query?.product_id || 'cakola';
        try {
          const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/payment-channels?productId=${encodeURIComponent(productId)}`, { timeout: 5000 });
          if (response.data?.success) {
            return reply.send({
              success: true,
              message: 'Payment channels retrieved',
              data: response.data.data
            });
          }
        } catch (err: any) {
          console.error('[Fallback payment-channels failed]:', err.message);
        }

        // Offline Fallback list
        return reply.send({
          success: true,
          message: 'Payment channels retrieved (offline fallback)',
          data: [
            { code: 'QRIS2', name: 'QRIS (Gopay/OVO/Dana/BCA/dll)', group: 'E-Wallet', fee_flat: 0, fee_percent: 0.7, icon_url: 'https://img.icons8.com/fluency/96/qr-code.png' },
            { code: 'MANDIRIVA', name: 'Mandiri Virtual Account', group: 'Virtual Account', fee_flat: 3000, fee_percent: 0, icon_url: 'https://img.icons8.com/color/96/bank.png' },
            { code: 'BCAVA', name: 'BCA Virtual Account', group: 'Virtual Account', fee_flat: 3000, fee_percent: 0, icon_url: 'https://img.icons8.com/color/96/bank.png' },
            { code: 'BRIVA', name: 'BRI Virtual Account', group: 'Virtual Account', fee_flat: 3000, fee_percent: 0, icon_url: 'https://img.icons8.com/color/96/bank.png' },
            { code: 'BNIVA', name: 'BNI Virtual Account', group: 'Virtual Account', fee_flat: 3000, fee_percent: 0, icon_url: 'https://img.icons8.com/color/96/bank.png' },
          ]
        });
      });

      await fastify.register(subscriptionCheckRoutes, { prefix: '/subscriptions' });

      const { menuRoutes } = await import('../modules/menu/routes/menu.routes');
      await fastify.register(menuRoutes, { prefix: '/menu' });
      const { systemConfigRoutes } = await import('../modules/system-config/routes/system-config.routes');
      await fastify.register(systemConfigRoutes, { prefix: '/system/config' });
      const { easyTunnelRoutes } = await import('../modules/easy-tunnel/routes/easy-tunnel.routes');
      await fastify.register(easyTunnelRoutes, { prefix: '/system/easy-tunnel' });
      const { systemUpdateRoutes } = await import('../modules/system-config/routes/system-update.routes');
      await fastify.register(systemUpdateRoutes, { prefix: '/system/update' });
      const { observabilityRoutes } = await import('../modules/observability/routes/observability.routes');
      await fastify.register(observabilityRoutes, { prefix: '/system/observability' });

      const { communicationRoutes } = await import(
        '../modules/communication/routes/communication.routes'
      );
      await fastify.register(communicationRoutes, { prefix: '/communication' });
      // (Moved sekolahRoutes to public block above)
      const { consentRoutes } = await import('../modules/consent/routes/consent.routes');
      await fastify.register(consentRoutes, { prefix: '/consent' });
      const { uploadRoutes } = await import('../modules/upload/routes/upload.routes');
      await fastify.register(uploadRoutes, { prefix: '/upload' });
      const { documentsRoutes } = await import('../modules/document-center/routes/documents.routes');
      await fastify.register(documentsRoutes, { prefix: '/documents' });



      const { notificationRoutes } = await import('../modules/notification/routes/notification.routes');
      await fastify.register(notificationRoutes, { prefix: '/notifications' });
      await fastify.register(notificationRoutes, { prefix: '/notification' });
      await fastify.register(notificationRoutes, { prefix: '/v1/notifications' });

      // Cooperative Module (Protected & Capability Guarded)
      const { default: cooperativePlugin } = await import('../modules/cooperative/plugin');
      await fastify.register(cooperativePlugin, { prefix: '/cooperative' });

      // Kesiswaan Module
      const { pelanggaranRoutes } = await import('../modules/kesiswaan/routes/pelanggaran.routes');
      await fastify.register(pelanggaranRoutes, { prefix: '/kesiswaan/pelanggaran' });

      const { jenisPelanggaranRoutes } = await import('../modules/kesiswaan/routes/jenis-pelanggaran.routes');
      await fastify.register(jenisPelanggaranRoutes, { prefix: '/kesiswaan/jenis-pelanggaran' });

      const { prestasiRoutes } = await import('../modules/kesiswaan/routes/prestasi.routes');
      await fastify.register(prestasiRoutes, { prefix: '/kesiswaan' });

      const { jadwalKegiatanRoutes } = await import('../modules/attendance/jadwal-kegiatan/routes/jadwal-kegiatan.routes');
      await fastify.register(jadwalKegiatanRoutes, { prefix: '/kesiswaan/jadwal-kegiatan' });

      const { suratMasukRoutes } = await import('../modules/correspondence/routes/surat-masuk.routes');
      await fastify.register(suratMasukRoutes, { prefix: '/correspondence/surat-masuk' });

      const { suratKeluarRoutes } = await import('../modules/correspondence/routes/surat-keluar.routes');
      await fastify.register(suratKeluarRoutes, { prefix: '/correspondence/surat-keluar' });

      const { templateSuratRoutes } = await import('../modules/correspondence/routes/template-surat.routes');
      await fastify.register(templateSuratRoutes, { prefix: '/correspondence/template-surat' });

      const { bpbkRoutes } = await import('../modules/bpbk/routes/bpbk.routes');
      await fastify.register(bpbkRoutes, { prefix: '/bpbk' });

      // Kurikulum Module
      const { supervisiRoutes } = await import('../modules/kurikulum/routes/supervisi.routes');
      await fastify.register(supervisiRoutes, { prefix: '/kurikulum/supervisi' });

      const { default: strukturKurikulumRoutes } = await import('../modules/kurikulum/routes/struktur-kurikulum.routes');
      await fastify.register(strukturKurikulumRoutes, { prefix: '/kurikulum/struktur' });

      const { default: kospConfigRoutes } = await import('../modules/kurikulum/routes/kosp-config.routes');
      await fastify.register(kospConfigRoutes, { prefix: '/kurikulum' });


      // Jadwal Module
      const { default: jadwalValidationRoutes } = await import('../modules/jadwal/routes/jadwal-validation.routes');
      await fastify.register(jadwalValidationRoutes, { prefix: '/jadwal' });

      // Penilaian (KKM & Nilai)
      const { default: kkmRoutes } = await import('../modules/kurikulum/routes/kkm.routes');
      await fastify.register(kkmRoutes, { prefix: '/kurikulum/kkm' });

      // Perangkat Ajar (Kurikulum)
      const { default: perangkatAjarRoutes } = await import('../modules/kurikulum/routes/perangkat-ajar.routes');
      await fastify.register(perangkatAjarRoutes, { prefix: '/kurikulum' });

      // Kalender Akademik (Kurikulum)
      const { kalenderAkademikRoutes } = await import('../modules/kurikulum/routes/kalender-akademik.routes');
      await fastify.register(kalenderAkademikRoutes, { prefix: '/kurikulum/kalender' });

      // Rekap KBM (Kurikulum)
      const { rekapKBMRoutes } = await import('../modules/kurikulum/routes/rekap-kbm.routes');
      await fastify.register(rekapKBMRoutes, { prefix: '/kurikulum/rekap-kbm' });

      // Jadwal Pelajaran (Kurikulum) — Supports both /kurikulum/jadwal-kbm & /kurikulum/jadwal prefixes
      const { jadwalKBMRoutes } = await import('../modules/kurikulum/jadwal-kbm/routes/jadwal-kbm.routes');
      await fastify.register(jadwalKBMRoutes, { prefix: '/kurikulum/jadwal-kbm' });
      await fastify.register(jadwalKBMRoutes, { prefix: '/kurikulum/jadwal' });

      // Guru Mapel (Kurikulum)
      const { default: guruMapelRoutes } = await import('../modules/kurikulum/guru-mapel/routes/guru-mapel.routes');
      await fastify.register(guruMapelRoutes, { prefix: '/kurikulum/guru-mapel' });

      // Guru Time-Off (Kurikulum)
      const { guruTimeOffRoutes } = await import('../modules/kurikulum/guru-time-off/routes/guru-time-off.routes');
      await fastify.register(guruTimeOffRoutes, { prefix: '/kurikulum/guru-time-off' });

      // Wali Kelas (Kurikulum)
      const { waliKelasRoutes } = await import('../modules/kurikulum/wali-kelas/routes/wali-kelas.routes');
      await fastify.register(waliKelasRoutes, { prefix: '/kurikulum/wali-kelas' });

      // Jadwal Piket Guru (Kurikulum)
      const { jadwalPiketRoutes } = await import('../modules/kurikulum/jadwal-piket/routes/jadwal-piket.routes');
      await fastify.register(jadwalPiketRoutes, { prefix: '/kurikulum/jadwal-piket' });

      // Modul Rapor & Penilaian (Decoupled dari Kurikulum)
      const { default: nilaiRoutes } = await import('../modules/rapor/routes/nilai.routes');
      await fastify.register(nilaiRoutes, { prefix: '/rapor/nilai' });

      const { default: raporRoutes } = await import('../modules/rapor/routes/rapor.routes');
      await fastify.register(raporRoutes, { prefix: '/rapor' });

      const { default: ukkSklRoutes } = await import('../modules/rapor/routes/ukk-skl.routes');
      await fastify.register(ukkSklRoutes, { prefix: '/rapor' });

      const { default: p5Routes } = await import('../modules/rapor/routes/p5.routes');
      await fastify.register(p5Routes, { prefix: '/rapor/p5' });

      // Attendance Module (Protected & Capability Guarded)
      const { default: attendancePlugin } = await import('../modules/attendance/plugin');
      await fastify.register(attendancePlugin);

      // Reporting Module (Protected & Capability Guarded)
      const { reportingModule } = await import('../modules/reporting');
      await reportingModule(fastify);

      // Sarpras Module (Protected & Capability Guarded)
      const { sarprasRoutes } = await import('../modules/sarpras/routes/sarpras.routes');
      await fastify.register(sarprasRoutes, { prefix: '/sarpras' });

      // Hubin Module (Protected & Capability Guarded)
      const { hubinRoutes } = await import('../modules/hubin/routes/hubin.routes');
      await fastify.register(hubinRoutes, { prefix: '/hubin' });

      // WhatsApp Module
      const { whatsappRoutes } = await import('../modules/whatsapp/routes/whatsapp.routes');
      await fastify.register(whatsappRoutes, { prefix: '/whatsapp' });

      // Piket Guru Module
      const { piketModule } = await import('../modules/kesiswaan/piket');
      await fastify.register(piketModule, { prefix: '/kesiswaan/piket' });



      // Moving business routes from root to /api
      fastify.post('/upload/file', {
        config: { skipAuth: true, public: true },
        schema: {
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    filename: { type: 'string' },
                    mimetype: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }, async (request: any, reply: any) => {
        const { uploadController } = await import('../modules/upload/controllers/upload.controller');
        return uploadController.uploadFile(request, reply);
      });

      const { documentsPublicRoutes } = await import('../modules/document-center/routes/documents.routes');
      await fastify.register(documentsPublicRoutes, { prefix: '/documents/public' });

      fastify.options('/embedding', {
        config: { skipAuth: true },
      }, async (request: any, reply: any) => {
        const origin = (request.headers as any)?.origin || '*';
        reply.header('Access-Control-Allow-Origin', origin);
        reply.header('Vary', 'Origin');
        reply.header('Access-Control-Allow-Credentials', 'true');
        reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept');
        reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        reply.status(204).send();
      });
      fastify.post('/embedding', {
        config: { skipAuth: true },
        preHandler: async (request: any, reply: any) => {
          const origin = (request.headers as any)?.origin || '*';
          reply.header('Access-Control-Allow-Origin', origin);
          reply.header('Vary', 'Origin');
          reply.header('Access-Control-Allow-Credentials', 'true');
          reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept');
          reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        },
        schema: {
          body: {
            type: 'object',
            required: ['image_base64'],
            properties: {
              image_base64: { type: 'string' },
              model: { type: 'string' }
            }
          }
        }
      }, async (request: any, reply: any) => {
        try {
          const { image_base64, model } = request.body || {};
          if (!image_base64) {
            reply.status(400);
            return { success: false, message: 'image_base64 wajib diisi' };
          }
          let cleaned = String(image_base64);
          if (cleaned.startsWith('data:')) {
            const idx = cleaned.indexOf(',');
            if (idx !== -1) cleaned = cleaned.slice(idx + 1);
          }
          const arrLen = 512;
          const basis = cleaned.length > 0 ? cleaned : String(model || 'insightface/arcface');
          const embedding = Array.from({ length: arrLen }, (_, i) => {
            const ch = basis.charCodeAt(i % basis.length) || 0;
            return ((ch % 100) - 50) / 50;
          });
          return { embedding, model: model || 'insightface/arcface' };
        } catch (e: any) {
          reply.status(500);
          return { success: false, message: e?.message || 'error' };
        }
      });

      fastify.post('/stress/attendance/session', {
        preHandler: [requireCapability('superadmin.infra.monitoring.view')],
        config: {
          rateLimit: {
            max: 200000,
            timeWindow: '1 minute',
          },
        },
        handler: async (request: any, reply: any) => {
          const secret = String(process.env.STRESS_TEST_SECRET || '').trim();
          if (!secret) {
            reply.status(503);
            return { success: false, code: 'STRESS_DISABLED', message: 'Stress endpoint disabled' };
          }
          const headerSecret = String((request.headers as any)?.['x-stress-secret'] || '').trim();
          if (headerSecret !== secret) {
            reply.status(403);
            return { success: false, code: 'INVALID_STRESS_SECRET', message: 'Access denied' };
          }
          const rawBody = request.body || {};
          const studentId =
            typeof rawBody.studentId === 'string' && rawBody.studentId.trim().length > 0 ? rawBody.studentId.trim() : '';
          const sessionId =
            typeof rawBody.sessionId === 'string' && rawBody.sessionId.trim().length > 0
              ? rawBody.sessionId.trim()
              : 'stress-session';
          const msRaw = Number(rawBody.ms ?? 25);
          const ms = Math.max(0, Math.min(60000, Number.isFinite(msRaw) ? msRaw : 25));
          if (!studentId) {
            reply.status(400);
            return { success: false, code: 'INVALID_BODY', message: 'Expected body: { studentId, sessionId? }' };
          }
          const { getAttendanceQueue } = await import('../queues/attendance.queue');
          const q = getAttendanceQueue();
          const ts = Date.now();
          await q.add(
            'attendance-stress-session',
            { ts, studentId, sessionId, ms },
            { jobId: `stress_session_${sessionId}_${studentId}_${ts}`, removeOnComplete: true, removeOnFail: true, attempts: 1 }
          );
          reply.status(200);
          return { success: true, message: 'Enqueued stress session job', data: { studentId, sessionId, ts } };
        },
      });

      }); // Close protectedApi
    }, { prefix: '/api' }); // Close apiRoutes wrapper with /api prefix

  }); // Close the wrapper block from line 149


  // fastify.addHook('onReady', async () => {
  //   console.log('🔥 Registered routes:', fastify.printRoutes());
  // });
}
