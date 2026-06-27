import { UserPayload } from '../types/fastify';
import { isSystemSuperAdmin } from '../utils/rbac';

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


  const routeConfig =
    (request as any).routeOptions?.config ||
    (request as any).routeConfig ||
    (request as any).context?.config;

  if (routeConfig && (routeConfig.skipAuth || routeConfig.public)) {
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
    return;
  }
  
  // Extract token from Authorization header
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
    // Verify JWT token using Fastify's JWT plugin
    const payload = await request.jwtVerify() as UserPayload;
    
    // Store user payload in request object and normalize common fields
    request.user = payload;
    try {
      (request.user as any).tenant_id = (payload as any).tenant_id ?? (payload as any).tenantId ?? (request.user as any).tenant_id;
      (request.user as any).tenantId = (payload as any).tenantId ?? (payload as any).tenant_id ?? (request.user as any).tenantId;
      (request.user as any).roleName = (payload as any).roleName ?? (payload as any).role?.name ?? (request.user as any).roleName;
    } catch {}

    const roleName = (payload as any).roleName || (payload as any).role?.name;
    const tenantIdFromPayload = (payload as any).tenantId || (payload as any).tenant_id;

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


      // Ensure tenantId matches the one in the header (if provided)
      if (request.tenantId && request.tenantId !== tenantIdFromPayload) {
        request.log.warn({
          event: 'AUTH_TENANT_MISMATCH',
          tokenTenant: tenantIdFromPayload,
          headerTenant: request.tenantId
        }, `[AUTH] Tenant Mismatch | Token: ${tenantIdFromPayload} | Header: ${request.tenantId}`);
        return reply.status(403).send({
          code: 'FORBIDDEN',
          message: 'Token mismatch with requested tenant'
        });
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
