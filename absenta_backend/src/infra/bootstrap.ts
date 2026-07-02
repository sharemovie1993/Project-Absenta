import path from 'path';
import crypto from 'crypto';
import { getRedisConnection } from './redis/redisClient';
import { authMiddleware } from '../middlewares/auth';
import { storageService } from './storage/storage.service';
import { getSmartApiBaseUrl, getSmartFrontendBaseUrl, getDomainBases } from '@/utils/url-helper';

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
        if (allowedExactHosts.has(host)) {
          ok = true;
          reason = 'env_exact_host';
        } else if ([...allowedBaseDomains].some((d) => host === d || host.endsWith(`.${d}`))) {
          ok = true;
          reason = 'env_base_domain';
        } else if ((process.env.NODE_ENV !== 'production' || (process.env.DEV_ALLOW_LOCALHOST_LOGIN || '').toLowerCase() === 'true') && (
          host === 'localhost' ||
          host.endsWith('.localhost') ||
          host === '127.0.0.1' ||
          host === '10.10.10.250' ||
          // Allow private/LAN IP ranges for dev testing or flexible local deployment
          /^192\.168\.\d+\.\d+$/.test(host) ||
          /^10\.\d+\.\d+\.\d+$/.test(host) ||
          /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)
        )) {
          ok = true;
          reason = 'dev_or_flexible_local';
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
    secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-this-in-production'
  });

  const rateLimitOptions: any = {
    global: true, // Enable global rate limiting
    max: 5000, // Increased limit to support asset loading
    timeWindow: '1 minute',
    keyGenerator: (req: any) => {
      const xff = (req.headers && req.headers['x-forwarded-for']) ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : '';
      return xff || req.ip;
    },
    allowList: (req: any) => {
      const host = String(req.headers?.host || req.headers?.['x-forwarded-host'] || '');
      if (req.ip === '127.0.0.1' || req.ip === 'localhost' || req.ip === '::1') return true;
      if (/localhost|127\.0\.0\.1/i.test(host)) return true;
      // Always allow static assets
      if (req.url && req.url.startsWith('/assets/')) return true;
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
    const subPath = raw.replace(/^\/+/, '');
    const key = `uploads/${subPath}`;
    const ext = subPath.includes('.') ? subPath.split('.').pop()!.toLowerCase() : '';
    const contentType =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
          ? 'image/png'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'svg'
                ? 'image/svg+xml'
                : ext === 'ico'
                  ? 'image/x-icon'
                  : ext === 'pdf'
                    ? 'application/pdf'
                    : 'application/octet-stream';

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



  await fastify.register(require('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 }
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
}

export async function registerMiddlewares(fastify: any, appendLog: (entry: any) => void) {
  console.log('⚠️ Middleware registration skipped at global level - will be registered in /api plugin');
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

    return true;
  };
  fastify.addHook('onRequest', async (request: any, reply: any) => {
    const correlationId = request.headers?.['x-correlation-id']
      ? String(request.headers['x-correlation-id'])
      : crypto.randomUUID();
    request.correlationId = correlationId;
    try {
      reply.header('x-correlation-id', correlationId);
      const backendNodeId =
        process.env.BACKEND_NODE_ID ||
        process.env.BACKEND_NODE_LABEL ||
        '';
      if (backendNodeId) {
        reply.header('x-backend-node', backendNodeId);
      }
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
