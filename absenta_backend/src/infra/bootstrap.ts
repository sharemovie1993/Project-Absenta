import path from 'path';
import crypto from 'crypto';
import { getRedisConnection } from './redis/redisClient';
import { authMiddleware } from '../middlewares/auth';
import { serverLicenseGuard } from '../middlewares/server-license.guard';
import { storageService } from './storage/storage.service';
import { getSmartApiBaseUrl, getSmartFrontendBaseUrl, getDomainBases } from '../utils/url-helper';
import { getNodeId } from './nodeId';

export async function registerPlugins(fastify: any) {
  // 1. REGISTER CORS PALING ATAS
  const corsDebug = (process.env.CORS_DEBUG || 'false').toLowerCase() === 'true';
  
  // Cleanup deprecated CORS env to avoid Error throw
  const deprecatedCorsKeys = ['ALLOWED_ORIGINS', 'CORS_ALLOW_ALL', 'CORS_WILDCARD_BASES', 'ALLOW_LOCALHOST_WILDCARD'];
  deprecatedCorsKeys.forEach(key => {
    if (process.env[key]) {
      if (corsDebug) console.log(`[CORS] Removing deprecated env key: ${key}`);
      delete process.env[key];
    }
  });

  const getHostFromEnvUrl = (raw: string | undefined): string => {
    const v = String(raw || '').trim();
    if (!v) return '';
    try {
      return new URL(v).hostname.toLowerCase();
    } catch {
      try {
        return new URL(`https://${v}`).hostname.toLowerCase();
      } catch {
        return '';
      }
    }
  };



  const allowedBaseDomains = new Set<string>([
    ...getDomainBases().map(d => `.${d}`),
    ...getDomainBases(),
    'localhost',
  ]);

  const allowedExactHosts = new Set<string>([
    getHostFromEnvUrl(getSmartFrontendBaseUrl()),
    getHostFromEnvUrl(getSmartApiBaseUrl()),
    getHostFromEnvUrl(process.env.API_URL),
    getHostFromEnvUrl(process.env.API_URL),
    process.env.ALLOWED_LAN_IP,
  ].filter((v): v is string => Boolean(v)));

  await fastify.register(require('@fastify/cors'), {
    origin: (origin: string | undefined, cb: any) => {
      if (!origin) return cb(null, true);
      let ok = false;
      let reason = 'unknown';
      try {
        const host = new URL(origin).hostname.toLowerCase();
        // 1. Mobile Hybrid App Containers (Capacitor / Cordova on Android & iOS)
        if (
          host === 'localhost' ||
          host.endsWith('.localhost') ||
          origin.startsWith('capacitor://') ||
          origin.startsWith('ionic://') ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('https://localhost')
        ) {
          ok = true;
          reason = 'mobile_hybrid_container';
        } else if (allowedExactHosts.has(host)) {
          ok = true;
          reason = 'env_exact_host';
        } else if ([...allowedBaseDomains].some((d) => host === d || host.endsWith(`.${d}`))) {
          ok = true;
          reason = 'env_base_domain';
        } else if (
          // Allow custom tenant domains (e.g. absen.smkn2pwk.sch.id) or private/LAN IP ranges
          host.includes('.') ||
          /^192\.168\.\d+\.\d+$/.test(host) ||
          /^10\.\d+\.\d+\.\d+$/.test(host) ||
          /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)
        ) {
          ok = true;
          reason = 'tenant_network_or_custom_domain';
        }
      } catch (err) {
        reason = 'origin_parse_error';
      }
      if (corsDebug) {
        console.log(`[CORS] Decision for ${origin}: ${ok ? 'ALLOWED' : 'BLOCKED'} (${reason})`);
      }
      return cb(null, ok);
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    exposedHeaders: ['x-correlation-id', 'x-backend-node'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'x-correlation-id',
      'x-socket-id',
      'x-requested-with',
      'accept',
      'origin',
      'user-agent',
      'x-skip-403-redirect',
      'X-Tenant-Host',
      'X-Tenant-Sub',
      'X-Tenant-Domain',
      'X-Tenant-ID',
      'X-Skip-Tenant',
      'X-Requested-With',
      'X-Skip-403-Redirect',
      'Accept'
    ],
    maxAge: 86400, // Cache preflight response for 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  await fastify.register(require('@fastify/jwt'), {
    secret: process.env['JWT_SECRET'] || 'absenta-dev-secret-key-32-chars!!'
  });

  const rateLimitOptions: any = {
    global: true, // Enable global rate limiting
    max: 25000, // Elevated to 25,000 for high-density institutional environments (e.g. 2,000 CBT concurrent students)
    timeWindow: '1 minute',
    keyGenerator: (req: any) => {
      // Isolate bucket per user ID for authenticated students/teachers
      // Prevents 2,000 students behind a single school NAT router IP from sharing one rate limit bucket
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      const xff = (req.headers && req.headers['x-forwarded-for']) ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : '';
      return xff || req.ip;
    },
    allowList: (req: any) => {
      const host = String(req.headers?.host || req.headers?.['x-forwarded-host'] || '');
      if (req.ip === '127.0.0.1' || req.ip === 'localhost' || req.ip === '::1') return true;
      if (/localhost|127\.0\.0\.1/i.test(host)) return true;
      // Always allow static assets
      if (req.url && req.url.startsWith('/assets/')) return true;
      // High-frequency CBT autosave sync endpoints (<20s interval) are exempted from IP-level lockout
      if (req.url && req.url.includes('/cbt/engine/') && req.url.includes('/sync')) return true;
      return false;
    },
    errorResponseBuilder: (_request: any, context: any) => {
      return {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
        date: Date.now(),
        expiresIn: context.ttl
      }
    }
  };
  try {
    const redisClient = getRedisConnection() as any;
    if (typeof redisClient?.pipeline === 'function') {
      rateLimitOptions.redis = redisClient;
    }
  } catch {
    fastify.log.warn('Rate limit using memory store (redis client unavailable)');
  }
  await fastify.register(require('@fastify/rate-limit'), rateLimitOptions);

  fastify.addContentTypeParser(/^application\/x-www-form-urlencoded(;.*)?$/i, { parseAs: 'string' }, (_req: any, body: string, done: any) => {
    try {
      const parsed = Object.fromEntries(new URLSearchParams(body));
      done(null, parsed);
    } catch (err) {
      done(err);
    }
  });

  await fastify.register(require('fastify-raw-body'), {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true
  });

  const handleUploadRequest = async (request: any, reply: any) => {
    const raw = String((request.params && (request.params as any)['*']) || '');
    let subPath = raw.replace(/^\/+/, '');
    try {
      subPath = decodeURIComponent(subPath);
    } catch {}
    
    let key = `uploads/${subPath}`;
    let fileExists = await storageService.exists(key);
    if (!fileExists) {
      key = subPath;
      fileExists = await storageService.exists(key);
    }
    if (!fileExists && !subPath.startsWith('storage/')) {
      key = `storage/${subPath}`;
      fileExists = await storageService.exists(key);
    }
    if (!fileExists && subPath.startsWith('uploads/')) {
      key = subPath.replace(/^uploads\//, '');
      fileExists = await storageService.exists(key);
    }

    if (!fileExists) {
      reply.header('Access-Control-Allow-Origin', '*');
      return reply.status(404).send({ success: false, message: 'File not found' });
    }

    const ext = subPath.includes('.') ? subPath.split('.').pop()!.toLowerCase() : '';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    if (
      String(process.env.STORAGE_USE_DIRECT_URL || '').trim().toLowerCase() === 'true' &&
      storageService.getDriverName() === 's3'
    ) {
      try {
        const directUrl = await storageService.getSignedDownloadUrl(key);
        if (directUrl) {
          return reply.redirect(302, directUrl);
        }
      } catch (err) {
        console.warn(`[StorageService] Failed to generate direct URL for key: ${key}, falling back to streaming`, err);
      }
    }

    const stream = storageService.createReadStream(key);
    stream.on('error', () => {
      if (reply.sent || reply.raw.headersSent) {
        try {
          reply.raw.destroy();
        } catch {}
        return;
      }
      reply.status(404);
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      void reply.send('File not found');
    });
    reply.type(contentType);
    // Add CORS headers for public assets to prevent ORB/CORS issues
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.send(stream);
  };

  fastify.get('/uploads/*', handleUploadRequest);
  fastify.get('/api/uploads/*', handleUploadRequest);
  fastify.get('/storage/*', handleUploadRequest);
  fastify.get('/api/storage/*', handleUploadRequest);



  await fastify.register(require('@fastify/multipart'), {
    limits: { fileSize: 2048 * 1024 * 1024 } // 2 GB untuk menampung paket cadangan & migrasi .absenta skala enterprise
  });

  fastify.setNotFoundHandler(function (request: any, reply: any) {
    try {
      const method = String(request.method || '').toUpperCase();
      const accept = String(request.headers?.accept || '').toLowerCase();
      const wantsHtml = accept.includes('text/html') || accept.includes('*/*');
      if (method === 'GET' && wantsHtml) {
        const fs = require('fs');
        const indexPath = path.join(process.cwd(), 'frontend', 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
          reply.type('text/html').send(fs.readFileSync(indexPath));
          return;
        }
      }
    } catch {}
    const statusCode = 404;
    reply.status(statusCode).send({
      statusCode,
      error: 'Not Found',
      message: 'Route not found'
    });
  });

  console.log('[Bootstrap] Plugins & CORS ready. Mounting application routes...');
}

export async function registerMiddlewares(fastify: any, appendLog: (entry: any) => void) {
  // Middleware registered in /api plugin
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
  const shouldLog = (urlPath: string) => {
    if (urlPath.startsWith('/uploads/') || urlPath.startsWith('/api/uploads/')) return false;
    if (urlPath === '/api/system/config' || urlPath === '/system/config') return false;
    if (urlPath === '/api/whatsapp/status' || urlPath === '/whatsapp/status') return false;

    return true;
  };
  fastify.addHook('onRequest', async (request: any, reply: any) => {
    const correlationId = request.headers?.['x-correlation-id']
      ? String(request.headers['x-correlation-id'])
      : crypto.randomUUID();
    request.correlationId = correlationId;
    try {
      reply.header('x-correlation-id', correlationId);
      const baseNodeId =
        process.env.BACKEND_NODE_ID ||
        process.env.BACKEND_NODE_LABEL ||
        getNodeId();
      const workerInstance = process.env.NODE_APP_INSTANCE ?? '0';
      reply.header('x-backend-node', `${baseNodeId}-w${workerInstance}`);
    } catch {}

    const urlPath = getUrlPath(request.url);
    if (!shouldLog(urlPath)) return;

    appendLog({
      type: 'request',
      method: request.method,
      url: request.url,
      headers: redactHeaders(request.headers),
      correlation_id: correlationId,
      ts: Date.now(),
    });
  });

  // 6. Register Global Middlewares
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', serverLicenseGuard);

  fastify.setErrorHandler(function (error: any, request: any, reply: any) {

    // 1. Map Prisma / Internal Errors
    let statusCode = error.statusCode || 500;
    let errorCode = error.code || 'INTERNAL_ERROR';
    let message = error.message || 'Internal Server Error';

    // Prisma Error Mapping
    if (error.code) {
      switch (error.code) {
        case 'P2002': // Unique constraint failed
          statusCode = 409;
          errorCode = 'CONFLICT';
          message = 'Data already exists (duplicate entry)';
          break;
        case 'P2025': // Record not found
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          message = 'Resource not found';
          break;
        case 'P2003': // Foreign key constraint failed
          statusCode = 400;
          errorCode = 'BAD_REQUEST';
          message = 'Invalid reference (foreign key constraint)';
          break;
      }
    }

    // Validation Error Mapping (Fastify Schema)
    if (error.validation) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = error.message;
    }

    // JWT Errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' || error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
      message = 'Invalid or expired token';
    }

    if (statusCode === 401) {
      request.log.error({
        event: 'FATAL_AUTH_DEBUG',
        path: request.url,
        code: errorCode,
        message: error.message,
        stack: error.stack
      }, `[FATAL_AUTH_DEBUG] 401 Unauthorized detected! URL: ${request.url}`);
    }



    // 2. Log Error (Server Side Only)
    // CRITICAL: Strip sensitive data from logs
    const safeHeaders = { ...request.headers };
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;

    console.error('[ERROR_HANDLER]', {
      code: errorCode,
      path: request.url,
      method: request.method,
      message: message,
      // Stack trace only in non-production or specific debug modes
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });

    appendLog({
      type: 'error',
      method: request?.method,
      url: request?.url,
      error: message,
      code: errorCode,
      // Stack trace stored in logs but NOT sent to client
      stack: error.stack,
      ts: Date.now()
    });

    // 3. Send Response (Safe for Client)
    // Standard Format: { code, message }
    reply.status(statusCode).send({
      success: false,
      code: errorCode,
      message: message,
      // Optional: details for validation errors
      details: error.validation ? error.validation : undefined
    });
  });
}
