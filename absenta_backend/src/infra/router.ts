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
          url.startsWith('/subscriptions') ||
          url.startsWith('/invoice') ||
          url.startsWith('/payments')
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
      const { billingRoutes } = await import('../modules/billing/routes/billing.routes');
      const { billingDashboardRoutes } = await import('../modules/billing/routes/billing-dashboard.routes');
      const { billingReportsRoutes } = await import('../modules/billing/routes/billing-reports.routes');
      const { mySubscriptionRoutes } = await import('../modules/billing/routes/my-subscription.routes');
      const { billingSettingsRoutes } = await import('../modules/billing/routes/billing-settings.routes');
      await fastify.register(planRoutes, { prefix: '/billing/plans' });
      await fastify.register(moduleRoutes, { prefix: '/billing/modules' });
      await fastify.register(subscriptionRoutes, { prefix: '/billing/subscriptions' });
      await fastify.register(mySubscriptionRoutes, { prefix: '/billing/my-subscription' });
      await fastify.register(subscriptionCheckRoutes, { prefix: '/subscriptions' });
      await fastify.register(billingRoutes, { prefix: '/billing/billings' });
      await fastify.register(billingReportsRoutes, { prefix: '/billing/reports' });
      await fastify.register(billingSettingsRoutes, { prefix: '/billing/settings' });
      await fastify.register(billingDashboardRoutes, { prefix: '/billing' });


      const { tenantDetailRoutes } = await import('../modules/superadmin/tenant-detail/routes/tenant-detail.routes');
      await fastify.register(tenantDetailRoutes, { prefix: '/superadmin/tenants' });
      
      const { infraRoutes } = await import('../modules/superadmin/infra/routes/infra.routes');
      await fastify.register(infraRoutes, { prefix: '/superadmin/infra' });

      const { infraMonitoringRoutes } = await import('../modules/superadmin/infra-monitoring/routes/infra-monitoring.routes');
      await fastify.register(infraMonitoringRoutes, { prefix: '/admin/infra' });

      const { platformIntelligenceRoutes } = await import('../modules/superadmin/infra/routes/platformIntelligence.routes');
      await fastify.register(platformIntelligenceRoutes, { prefix: '/superadmin/intelligence' });

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
      const { riskAdminRoutes } = await import('../modules/risk/routes/risk-admin.routes');
      await fastify.register(riskAdminRoutes, { prefix: '/admin/risk' });
      const { revenueAdminRoutes } = await import('../modules/revenue/routes/revenue-admin.routes');
      await fastify.register(revenueAdminRoutes, { prefix: '/admin/revenue' });
      const { analyticsAdminRoutes } = await import('../modules/analytics/routes/analytics-admin.routes');
      await fastify.register(analyticsAdminRoutes, { prefix: '/admin/analytics' });
      const { upgradeIntelligenceAdminRoutes } = await import(
        '../modules/upgrade-intelligence/routes/upgrade-intelligence-admin.routes'
      );
      await fastify.register(upgradeIntelligenceAdminRoutes, { prefix: '/admin/analytics/upgrade' });

      const { supportTicketRoutes } = await import(
        '../modules/support-ticket/routes/support-ticket.routes'
      );
      await fastify.register(supportTicketRoutes, { prefix: '/support' });
      // (Moved sekolahRoutes to public block above)
      const { consentRoutes } = await import('../modules/consent/routes/consent.routes');
      await fastify.register(consentRoutes, { prefix: '/consent' });
      const { uploadRoutes } = await import('../modules/upload/routes/upload.routes');
      await fastify.register(uploadRoutes, { prefix: '/upload' });
      const { documentsRoutes } = await import('../modules/document-center/routes/documents.routes');
      await fastify.register(documentsRoutes, { prefix: '/documents' });
      const { pdfRoutes } = await import('../modules/pdf/routes/pdf.routes');
      await fastify.register(pdfRoutes, { prefix: '/pdf' });

      const { invoiceRoutes } = await import('../modules/invoice/routes/invoice.routes');
      await fastify.register(invoiceRoutes, { prefix: '/invoice' });

      const { paymentRoutes } = await import('../modules/payment/routes/payment.routes');
      await fastify.register(async function paymentApi(fastify: any) {
        await paymentRoutes(fastify, prisma);
      }, { prefix: '/payments' });

      const { testRoutes } = await import('../modules/payment/routes/test.routes');
      await fastify.register(testRoutes, { prefix: '/platform/payments' });

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

      const { suratMasukRoutes } = await import('../modules/correspondence/routes/surat-masuk.routes');
      await fastify.register(suratMasukRoutes, { prefix: '/correspondence/surat-masuk' });

      const { suratKeluarRoutes } = await import('../modules/correspondence/routes/surat-keluar.routes');
      await fastify.register(suratKeluarRoutes, { prefix: '/correspondence/surat-keluar' });

      const { bpbkRoutes } = await import('../modules/bpbk/routes/bpbk.routes');
      await fastify.register(bpbkRoutes, { prefix: '/bpbk' });

      // Kurikulum Module
      const { supervisiRoutes } = await import('../modules/kurikulum/routes/supervisi.routes');
      await fastify.register(supervisiRoutes, { prefix: '/kurikulum/supervisi' });

      const { default: strukturKurikulumRoutes } = await import('../modules/kurikulum/routes/struktur-kurikulum.routes');
      await fastify.register(strukturKurikulumRoutes, { prefix: '/kurikulum/struktur' });

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

      const { registerInvoicePublicRoutes } = await import('../modules/invoice/routes/public.routes');
      await fastify.register(registerInvoicePublicRoutes, { prefix: '/invoice/public' });

      const { registerPaymentPublicRoutes } = await import('../modules/payment/routes/public.routes');
      await fastify.register(registerPaymentPublicRoutes, { prefix: '/payment' });
      const { webhookRoutes } = await import('../modules/payment/routes/webhook.routes');
      await fastify.register(async function webhookApi(fastify: any) {
        await webhookRoutes(fastify, prisma);
      }, { prefix: '/webhooks/payment' });

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
