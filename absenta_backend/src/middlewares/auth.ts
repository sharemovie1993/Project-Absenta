import { UserPayload } from '../types/fastify';
import { isSystemSuperAdmin } from '../utils/rbac';
import { appendLog } from '../utils/logger';

// List of endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/health',
  // Auth endpoints
  '/auth/login', '/auth/register', '/auth/refresh', '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/request-password-reset', '/auth/confirm-password-reset',
  '/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/verify-email', '/api/auth/resend-verification',
  '/api/auth/request-password-reset', '/api/auth/confirm-password-reset',
  '/api/auth/register-tenant', '/auth/register-tenant',
  '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh',
  '/api/v1/auth/request-password-reset', '/api/v1/auth/confirm-password-reset',
  // Roles
  '/api/v1/roles', '/roles',
  // Branding active resolver (public)
  '/api/branding', '/branding',
  // Embedding provider (dummy) for development/testing
  '/api/embedding',
  // Public plans endpoint
  '/api/billing/plans/public', '/billing/plans/public',
  '/api/system/config', '/system/config',
  '/auth/check-domain', '/api/auth/check-domain',
  '/auth/check-email', '/api/auth/check-email',
  '/auth/tenant-info', '/api/auth/tenant-info',
  '/auth/dev/tenants', '/api/auth/dev/tenants', '/api/v1/auth/dev/tenants',
  '/stress/attendance/session',
  // Public Sekolah Lookups
  '/api/sekolah/lookup-npsn',
  // Hardware/IoT Gateways (Validated via device_id)
  '/api/attendance/devices/heartbeat',
  '/api/attendance/devices/tap'
];


export async function authMiddleware(
  request: any,
  reply: any
) {
  // Skip authentication for OPTIONS requests (CORS Preflight)

  if (request.method === 'OPTIONS') {
    return;
  }

  appendLog({
    type: 'auth_debug_start',
    url: request.url,
    hasAuth: !!request.headers.authorization
  });


  const routeConfig =
    (request as any).routeOptions?.config ||
    (request as any).routeConfig ||
    (request as any).context?.config;

  if (routeConfig && (routeConfig.skipAuth || routeConfig.public)) {
    if (request.log) {
      request.log.info({
        type: 'auth_debug_skipped',
        url: request.url,
        reason: 'routeConfig',
        config: routeConfig
      }, `[AUTH] Skipped due to route config: ${request.url}`);
    }
    return;
  }

  // Skip authentication for public endpoints (ignore query string)
  const urlPath = String(request.url || '').split('?')[0];
  const isSystemConfigPath = (urlPath === '/api/system/config' || urlPath === '/system/config');
  const isVerifyEmailPublic =
    urlPath.startsWith('/api/auth/verify-email') || urlPath.startsWith('/auth/verify-email');

  const isLookupNpsnPublic = urlPath.startsWith('/api/sekolah/lookup-npsn') || urlPath.startsWith('/sekolah/lookup-npsn');
  const isAuthPublic = (urlPath.startsWith('/api/auth/') || urlPath.startsWith('/auth/')) && 
                       !urlPath.endsWith('/me') && 
                       !urlPath.endsWith('/logout') && 
                       !urlPath.endsWith('/impersonate') && 
                       !urlPath.endsWith('/change-password');
  const isInvoicePublic = urlPath.startsWith('/api/invoice/public') || urlPath.startsWith('/invoice/public');
  const isPaymentPublic = urlPath.startsWith('/api/payment/public') || urlPath.startsWith('/payment/public');

  const isPublicEndpoint =
    (PUBLIC_ENDPOINTS.includes(urlPath) || isVerifyEmailPublic || isLookupNpsnPublic || isAuthPublic || isInvoicePublic || isPaymentPublic || urlPath.startsWith('/uploads/') || urlPath.startsWith('/api/uploads/')) &&
    (!isSystemConfigPath || request.method === 'GET');
  if (isPublicEndpoint) {
    if (request.log) {
      request.log.info({
        type: 'auth_debug_skipped',
        url: request.url,
        reason: 'isPublicEndpoint'
      }, `[AUTH] Skipped public endpoint: ${request.url}`);
    }
    return;
  }
  
  // Extract token from Authorization header or Query Parameter (for direct asset rendering in iframes)
  const tokenQuery = (request.query as any)?.token || (request.query as any)?.access_token;

  if (!request.headers.authorization && tokenQuery) {
    const cleanToken = String(tokenQuery).replace(/^Bearer\s+/i, '').trim();
    request.headers.authorization = `Bearer ${cleanToken}`;
  }
  
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    request.log.warn({
      event: 'AUTH_MISSING_HEADER',
      path: urlPath,
      ip: request.ip
    }, `[AUTH] Missing/Invalid Header | Path: ${urlPath} | IP: ${request.ip}`);
    return reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header'
    });
  }

  try {
    // Verify JWT token using Fastify's JWT plugin (Direct query token support or header verify)
    let payload: UserPayload;
    if (tokenQuery) {
      const cleanToken = String(tokenQuery).replace(/^Bearer\s+/i, '').trim();
      payload = await (request as any).server.jwt.verify(cleanToken) as UserPayload;
    } else {
      payload = await request.jwtVerify() as UserPayload;
    }
    
    // Store user payload in request object and normalize common fields
    request.user = payload;
    appendLog({
      type: 'auth_debug_verified',
      payload: payload
    });

    // Normalize user properties eagerly
    const normalizedUser = {
      ...payload,
      id: payload.id || (payload as any).userId || (payload as any).user_id,
      tenantId: payload.tenantId || (payload as any).tenant_id,
      tenant_id: (payload as any).tenant_id || payload.tenantId,
      roleName: payload.roleName || (payload as any).role?.name
    };
    request.user = normalizedUser;
    
    const shouldLog = (pathStr: string) => {
      if (pathStr.startsWith('/uploads/') || pathStr.startsWith('/api/uploads/')) return false;
      if (pathStr === '/api/system/config' || pathStr === '/system/config') return false;
      if (pathStr === '/api/whatsapp/status' || pathStr === '/whatsapp/status') return false;
      return true;
    };

    if (request.log && shouldLog(urlPath)) {
      request.log.info({
        event: 'AUTH_USER_SET',
        user: normalizedUser.email,
        tenant: normalizedUser.tenantId,
        path: urlPath
      }, `[AUTH] User set for ${normalizedUser.email} on ${urlPath}`);
    }

    const roleName = normalizedUser.roleName;
    const tenantIdFromPayload = normalizedUser.tenantId;

    // Token Tenant Integrity Check (ANTI CROSS-TENANT)
    // REVISI KEBIJAKAN: SUPERADMIN (system) allowed to access from any domain.
    const isSuperAdminSystem = isSystemSuperAdmin(roleName, tenantIdFromPayload);

    if (isSuperAdminSystem) {
       // Bypass tenant-domain restriction
       // SUPERADMIN boleh lintas domain
    } else {
      // Non-SUPERADMIN users must have tenantId
      if (!tenantIdFromPayload) {
        request.log.warn({
          event: 'AUTH_TENANT_MISSING',
          user: (payload as any).email,
          role: roleName,
          path: urlPath
        }, `[AUTH DEBUG] Token missing tenantId!
          User: ${(payload as any).email}
          Role: ${roleName}
          Path: ${urlPath}
          Payload: ${JSON.stringify(payload)}
        `);
        return reply.status(401).send({
             code: 'UNAUTHORIZED',
             message: 'Invalid token: missing tenant context' 
        });
      }

      // Sync request.tenantId with token tenant if domain resolution is different or missing
      // This is crucial after migration to ensure domain-based resolution doesn't block valid tokens
      if (request.tenantId && request.tenantId !== tenantIdFromPayload) {
        // Log mismatch for debugging but trust the token (JWT-first authority)
        // Unless it's a critical security boundary, but here we prioritize functionality after domain migration
        request.log.info({
          event: 'AUTH_TENANT_ADJUSTED',
          resolved: request.tenantId,
          token: tenantIdFromPayload,
          url: urlPath
        }, `[AUTH] Adjusting request.tenantId to match token: ${tenantIdFromPayload}`);
        request.tenantId = tenantIdFromPayload;
      } else if (!request.tenantId) {
        request.tenantId = tenantIdFromPayload;
      }
    }

  } catch (err) {
    request.log.warn({
      event: 'AUTH_VERIFICATION_FAILED',
      path: urlPath,
      error: (err as Error).message,
      ip: request.ip
    }, `[AUTH DEBUG] Verification Failed: ${(err as Error).message}`);
    return reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    });
  }


}
