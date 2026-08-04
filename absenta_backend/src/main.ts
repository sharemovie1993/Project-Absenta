import './infra/env'; // MUST BE THE FIRST LINE
import Fastify from 'fastify';
import { prisma } from './utils/prisma';
import { closeRedisConnections, getRedisConnection, initRedis, stopRedisConnection, verifyRedisConnection } from './infra/redis/redisClient';
import { initRealtime } from './infra/realtime';
import { registerPlugins, registerMiddlewares } from './infra/bootstrap';
import { registerRoutes } from './infra/router';
import { closeInvoicePdfQueue, initInvoicePdfWorker } from './modules/pdf/invoice-pdf.queue';
import { closeMouPdfQueue, initMouPdfWorker } from './modules/document-center/mou-pdf.queue';
import { initNotificationWorker } from './modules/notification/notification.worker';

import { initBillingPaymentEventConsumer } from './modules/billing/services/event-handlers/payment-succeeded.consumer';
import { initBillingTenantCreatedConsumer } from './modules/billing/services/event-handlers/tenant-created.consumer';
import { initAcademicTenantCreatedConsumer } from './modules/academic/services/event-handlers/tenant-created.consumer';
import { initKesiswaanTenantCreatedConsumer } from './modules/kesiswaan/services/event-handlers/tenant-created.consumer';
import { parentAuthService } from './modules/parent-app/services/parent-auth.service';
import { buildAttendanceFeed } from './modules/attendance/notify/controllers/notify.controller';
import { startAttendanceWorker } from './workers/attendance.worker';
import { initSchedulers } from './infra/scheduler';
import { trackService, registerService, printStartupTable } from './utils/startup-table';

// PHASE 1: Runtime Lock is now handled in infra/env

import { validateEnv } from './config/env';
validateEnv();

import { appendLog } from './utils/logger';

const pretty =
  (process.env.NODE_ENV || '').toLowerCase() !== 'production' &&
  (String(process.env.PINO_PRETTY || 'true').trim().toLowerCase() !== 'false');
const fastify = Fastify({
  logger: pretty
    ? {
        level: 'info',
        transport: { target: 'pino-pretty', options: { colorize: true } }
      }
    : { level: 'info' },
  bodyLimit: 15728640
});

// Add prisma to fastify instance
fastify.decorate('prisma', prisma);

// Register plugins/middlewares/routes moved to infra

// Start server
async function start() {
  process.title = 'absenta-api';
  const requireEnv = (name: string) => {
    const v = String(process.env[name] || '').trim();
    if (!v) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return v;
  };
  requireEnv('DATABASE_URL');
  requireEnv('JWT_SECRET');
  requireEnv('API_URL');
  const serviceRole = String(process.env.SERVICE_ROLE || process.env.WORKER_ROLE || '').trim().toLowerCase();
  const isWorkerOnly = serviceRole === 'pdf-worker' || serviceRole === 'pdf_worker' || serviceRole === 'worker' || serviceRole === 'recurring';
  const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';

  // STARTUP CHECK: CORS DEBUG IN PRODUCTION
  if (process.env.NODE_ENV === 'production' && (process.env.CORS_DEBUG || '').toLowerCase() === 'true') {
    console.warn('\n⚠️  WARNING: CORS_DEBUG is enabled in PRODUCTION environment!');
    console.warn('⚠️  This may cause log noise and performance impact. Disable it unless debugging.\n');
  }

  try {
    const isHybridMode = (process.env.EMBEDDED_WORKERS === 'true') || (isDev && !isWorkerOnly);

    // Hulu ke Hilir: Luruskan kabel untuk background workers utama
    const startBackgroundServices = async () => {
      // Ensure Redis is ready before starting workers
      await initRedis();
      
      await trackService('Invoice PDF Worker', 'worker', () => initInvoicePdfWorker());
      await trackService('MOU PDF Worker', 'worker', () => initMouPdfWorker());
      await trackService('Notification Worker', 'worker', () => initNotificationWorker());
      await trackService('Billing Tenant Consumer', 'consumer', () => initBillingTenantCreatedConsumer());
      await trackService('Academic Tenant Consumer', 'consumer', () => initAcademicTenantCreatedConsumer());
      await trackService('Kesiswaan Tenant Consumer', 'consumer', () => initKesiswaanTenantCreatedConsumer());
      await trackService('Attendance Worker', 'worker', () => startAttendanceWorker());
    };

    if (isWorkerOnly) {
      await prisma.$connect();
      await startBackgroundServices();
      fastify.log.info('Dedicated Worker Process started');
      await new Promise<void>(() => {});
      return;
    }

    // ðŸ” DEBUG: Hook level tertinggi untuk melacak SEMUA request
    const enableHighestLevelDebug =
      String(process.env.HIGHEST_LEVEL_DEBUG || '').trim().toLowerCase() === 'true' ||
      (process.env.NODE_ENV !== 'production' && String(process.env.HIGHEST_LEVEL_DEBUG || '').trim() !== 'false');
    if (enableHighestLevelDebug) {
      const lastLogAt = new Map<string, number>();
      const getUrlPath = (url: any) => String(url || '').split('?')[0];
      const redactHeaders = (headers: any) => {
        const safe = { ...(headers || {}) } as Record<string, any>;
        const redactKeys = [
          'authorization',
          'cookie',
          'set-cookie',
          'x-api-key',
          'x-callback-token',
          'x-callback-signature',
          'stripe-signature'
        ];
        for (const key of redactKeys) {
          if (typeof safe[key] !== 'undefined') safe[key] = '[REDACTED]';
        }
        return safe;
      };
      const shouldLog = (kind: 'request' | 'response', method: string, urlPath: string) => {
        if (urlPath.startsWith('/uploads/') || urlPath.startsWith('/api/uploads/')) return false;
        if (urlPath === '/api/system/config' || urlPath === '/system/config') return false;

        const now = Date.now();
        const key = `${kind}:${method}:${urlPath}`;
        const last = lastLogAt.get(key) || 0;
        if (now - last < 250) return false;
        lastLogAt.set(key, now);

        return true;
      };

      fastify.addHook('onRequest', async (request: any) => {
        const urlPath = getUrlPath(request.url);
        if (!shouldLog('request', request.method, urlPath)) return;
        const safeHeaders = redactHeaders(request.headers);
        console.log('ðŸš€ [HIGHEST LEVEL DEBUG] Request masuk:', {
          method: request.method,
          url: request.url,
          headers: safeHeaders,
          timestamp: new Date().toISOString()
        });
        appendLog({ type: 'request_high', method: request.method, url: request.url, headers: safeHeaders, ts: Date.now() });
      });

      fastify.addHook('onResponse', async (request: any, reply: any) => {
        const urlPath = getUrlPath(request.url);
        if (!shouldLog('response', request.method, urlPath)) return;
        console.log('📰 [HIGHEST LEVEL DEBUG] Response keluar:', {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          timestamp: new Date().toISOString()
        });
        appendLog({ type: 'response_high', method: request.method, url: request.url, statusCode: reply.statusCode, ts: Date.now() });
      });
      fastify.addHook('onError', async (request: any, reply: any, error: any) => {
        try {
          console.error('[GLOBAL_ERROR]', {
            method: request?.method,
            url: request?.url,
            statusCode: reply?.statusCode,
            message: error?.message,
            stack: error?.stack
          });
          appendLog({ type: 'error', method: request?.method, url: request?.url, statusCode: reply?.statusCode, message: error?.message, ts: Date.now() });
        } catch {}
      });
    }

    // ─── Infrastructure Services ───
    await trackService('Redis', 'infra', async () => {
      await verifyRedisConnection();
    });

    // Test database connection
    await trackService('PostgreSQL', 'infra', async () => {
      await prisma.$connect();
    });

    // Register all plugins, middlewares, and routes
    await trackService('Fastify Plugins', 'infra', async () => {
      await registerPlugins(fastify);
      await registerMiddlewares(fastify, appendLog);
    });

    await trackService('Route Registry', 'infra', async () => {
      await registerRoutes(fastify, prisma);
    });

    const tenantDetailProvider = {
      getTenantMetrics: async () => ({}),
      getRecentActivities: async () => [],
      getTenantLogs: async () => ({ data: [], total: 0 }),
      getAttendanceData: async () => ({}),
      getTenantBilling: async () => ({}),
      getTenantUsers: async () => ({ data: [], total: 0 }),
    };
    await trackService('Realtime (Socket.IO)', 'infra', async () => {
      const { io: _io, ioApi: _ioApi } = await initRealtime({
        server: fastify.server,
        fastify,
        prisma,
        adapters: {
          validateParentToken: (token: string) => parentAuthService.validateToken(token),
          buildAttendanceFeed,
          tenantDetailProvider,
        },
      });
      (globalThis as any).__io = _io;
      (globalThis as any).__ioApi = _ioApi;
    });

    const io = (globalThis as any).__io;
    const ioApi = (globalThis as any).__ioApi;

    await trackService('Event Bus', 'infra', async () => {
      const redis = getRedisConnection();
      await (await import('./infra/event-bus')).initEventBus({ redis, io, ioApi });
    });

    // ─── Start Fastify Server (INSTANT LISTEN - Non-Blocking) ───
    const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
    const port = parseInt(process.env.PORT || '3003');
    
    await fastify.listen({ port, host });
    registerService('Fastify HTTP Server', 'server', 'online');

    // Signal PM2 that the server is ready
    if (process.send) {
      process.send('ready');
    }

    // ─── Print PM2-style startup table ───
    printStartupTable(port, host);

    // ─── Background Workers & WhatsApp Restore (Non-Blocking Startup) ───
    void (async () => {
      try {
        if (isHybridMode) {
          await startBackgroundServices();
        }

        await trackService('Schedulers', 'scheduler', async () => {
          await initSchedulers(fastify);
        });

        // Background workers and dynamic modules
        await trackService('Billing Worker', 'worker', async () => { await import('./workers/billing.worker'); });
        await trackService('Analytics Worker', 'worker', async () => { await import('./workers/analytics.worker'); });
        await trackService('Infra Worker', 'worker', async () => { await import('./workers/infra.worker'); });
        await trackService('Maintenance Worker', 'worker', async () => { await import('./workers/maintenance.worker'); });

        await trackService('Billing Payment Consumer', 'consumer', async () => {
          await initBillingPaymentEventConsumer();
        });

        await trackService('Invoice PDF Consumer', 'consumer', async () => {
          const { initInvoicePdfDomainConsumer } = await import('./modules/pdf/invoice-pdf.queue');
          await initInvoicePdfDomainConsumer();
        });

        await trackService('WhatsApp Gateway Pool', 'infra', async () => {
          const { waGatewayService } = await import('./services/wa-gateway.service');
          await waGatewayService.restoreConnections();
        });

        // ─── Cetak Tabel Lengkap (Semua 22 Service Online) ───
        printStartupTable(port, host);
      } catch (err: any) {
        console.warn('[Background Services Startup Warning]:', err.message);
      }
    })();

    // Sync license with center licensing server asynchronously
    const { LicenseService } = await import('./infra/license/license.service');
    LicenseService.syncLicense().catch((err: any) => {
      console.warn('[License Startup Warning] Failed to sync license on startup:', err.message);
    });

    // Start heartbeat sync service dynamically
    try {
      const { heartbeatService } = await import('./modules/system-config/services/heartbeat.service');
      // Kirim heartbeat pertama kali saat boot secara background
      void heartbeatService.collectAndSendMetrics();
      // Jalankan cron scheduler untuk update berkala
      heartbeatService.startCronJob();
    } catch (err: any) {
      console.warn('[Heartbeat Startup Warning] Failed to initialize heartbeat service:', err.message);
    }
    
  } catch (error) {
    fastify.log.error('Error starting server:');
    fastify.log.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  await closeInvoicePdfQueue();
  await closeMouPdfQueue();
  await prisma.$disconnect();
  await closeRedisConnections();
  await stopRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  await closeInvoicePdfQueue();
  await closeMouPdfQueue();
  await prisma.$disconnect();
  await closeRedisConnections();
  await stopRedisConnection();
  process.exit(0);
});

// Start the application
start();
