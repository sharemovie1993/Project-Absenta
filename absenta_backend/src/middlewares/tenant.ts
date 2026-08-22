import { isSystemSuperAdmin } from '../utils/rbac';
import { subscriptionGuard } from './subscription.guard';
import { prisma } from '../utils/prisma';
import * as jwt from 'jsonwebtoken';
import { getDomainBases } from '../utils/url-helper';

export async function tenantMiddleware(
  request: any,
  reply: any
) {
  let tenantIdHeader = request.headers['x-tenant-id'] as string;
  const hostHeaderRaw = String(request.headers['x-forwarded-host'] || request.headers['host'] || '');
  const hostNoPort = hostHeaderRaw.split(':')[0].toLowerCase();
  const isPrivateLan =
    /^10\./.test(hostNoPort) ||
    /^192\.168\./.test(hostNoPort) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostNoPort);
  const isLocalHost =
    /localhost|127\.0\.0\.1/i.test(hostNoPort) || isPrivateLan;
  const devAllowLocal = String(process.env.DEV_ALLOW_LOCALHOST_LOGIN || '').toLowerCase() === 'true';
  const enableDebug = String(process.env.ENABLE_DEBUG_LOGS || '').toLowerCase() === 'true';
  const allowNonUuidForSuperadminLocal = isLocalHost && (devAllowLocal || enableDebug);
  const skipTenantHeader = request.headers['x-skip-tenant'];
  const skipTenant = typeof skipTenantHeader !== 'undefined' && (
    skipTenantHeader === 'true' || skipTenantHeader === '1' || skipTenantHeader === true
  );
  
  const urlPath = String(request.url || '').split('?')[0];
  const isPublicRegister = 
    urlPath.startsWith('/api/sekolah/lookup-npsn') || 
    urlPath.startsWith('/sekolah/lookup-npsn') ||
    urlPath.startsWith('/api/auth/') ||
    urlPath.startsWith('/auth/') ||
    urlPath.startsWith('/api/system/config') ||
    urlPath.startsWith('/system/config') ||
    urlPath.startsWith('/api/system/branding') ||
    urlPath.startsWith('/system/branding') ||
    urlPath.startsWith('/uploads/') ||
    urlPath.startsWith('/api/uploads/');
    
  // Resolve domain tenant (context only; not authoritative)
  let domainTenantId: string | undefined;
  const isIpAddress = /^[0-9.]+$/.test(hostNoPort);

  try {
    // 1. Try exact match with custom_domain
    const trCustom = await prisma.tenant.findFirst({ where: { custom_domain: { equals: hostNoPort, mode: 'insensitive' } } });
    if (trCustom) {
      domainTenantId = trCustom.id;
    } else {
      // 2. Try subdomain match
      const hostParts = hostNoPort.split('.');
      
      // If we are in dev mode and the host is localhost, we might not have a subdomain in the host header
      // but the user might be passing it via x-tenant-id or it should be in the JWT.
      
      const subdomain = (hostParts.length > 2 && !isIpAddress) ? hostParts[0] : '';
      if (subdomain) {
        const trSub = await prisma.tenant.findFirst({ where: { subdomain: { equals: subdomain, mode: 'insensitive' } } });
        if (trSub) { domainTenantId = trSub.id; }
      }
    }
  } catch (e) {
    console.error('[TenantMiddleware] Resolution Error:', e);
  }

  // Populate context tenantId for all requests
  if (domainTenantId) {
    request.tenantId = domainTenantId;
  }

  if (urlPath === '/health' || isPublicRegister || urlPath === '/api/attendance/devices/heartbeat' || urlPath === '/api/attendance/devices/tap') {
    return;
  }

  // PARENT APP HANDLER: Fix Tenant Resolution
  if (urlPath.startsWith('/parent-app') || urlPath.startsWith('/api/parent-app')) {
    let parentTenantId = domainTenantId; // Start with host-based resolution

    // Override with Origin if available (prefer Origin for CORS/API calls)
    // This handles the case where API is accessed via global API host but from a tenant subdomain PWA
    const originHeader = request.headers['origin'];
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    
    if (origin) {
      try {
        const hostname = new URL(origin).hostname;
        // Ignore generic domains based on central Domain Bases
        const domainBases = getDomainBases();
        const genericHosts = new Set<string>();
        for (const base of domainBases) {
          genericHosts.add(base);
          genericHosts.add(`api.${base}`);
          genericHosts.add(`www.${base}`);
          genericHosts.add(`app.${base}`);
        }
        
        if (!genericHosts.has(hostname)) {
          const subdomain = hostname.split('.')[0];
          const tr = await prisma.tenant.findFirst({ where: { subdomain: subdomain } });
          if (tr) parentTenantId = tr.id;
        }
      } catch (e) {}
    }

    // Logging for debugging
    console.log(`[TenantMiddleware] Parent App Resolution | Path: ${urlPath}`);
    console.log(`[TenantMiddleware] Origin: ${origin || 'N/A'} | Host: ${request.headers['host']}`);
    console.log(`[TenantMiddleware] Resolved Tenant: ${parentTenantId || 'Global/None'}`);

    if (parentTenantId) {
      request.tenantId = parentTenantId;
    }
    
    // Explicitly return to bypass standard JWT tenant checks
    return;
  }

  const routeConfig =
    (request as any).routeOptions?.config ||
    (request as any).context?.config ||
    (request as any).routeConfig;
  if (routeConfig && (routeConfig.skipAuth || routeConfig.public)) {
    return;
  }

  const jwtTenantId = request.user?.tenantId || request.user?.tenant_id;
  // Enforce global/bypass access only for system SUPERADMIN
  const systemSuperAdmin = isSystemSuperAdmin(
    request.user?.roleName,
    request.user?.tenant_id ?? request.user?.tenantId
  );
  
  // SUPERADMIN: allow explicit bypass
  if (skipTenant) {
    if (!systemSuperAdmin) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only SUPERADMIN from system tenant can use X-Skip-Tenant'
      });
    }
    request.tenantId = null;
    request.skipTenant = true;
    return;
  }

  // SUPERADMIN: optional explicit tenant selection via header, otherwise system scope
  if (systemSuperAdmin) {
    if (tenantIdHeader) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantIdHeader) && !allowNonUuidForSuperadminLocal) {
        return reply.status(400).send({
          error: 'Invalid tenant ID',
          message: 'X-Tenant-ID must be a valid UUID'
        });
      }
      request.tenantId = tenantIdHeader;
    } else {
      request.tenantId = null;
    }
    return;
  }
  
  // NON-SUPERADMIN: JWT-first authority
  if (!jwtTenantId) {
    // If we have a domain-based tenant, we set it. 
    // If this is a protected route, authMiddleware will eventually handle the missing user/token.
    if (domainTenantId) {
       request.tenantId = domainTenantId;
       return;
    }

    // If no user and no domain resolution, we only block if it's NOT a public route.
    // However, since this middleware is often registered on protected groups, we should be careful.
    if (request.user) {
       // Authenticated but no tenantId in JWT? That's a 400.
       return reply.status(400).send({
         error: 'Missing tenant ID',
         message: `User authenticated but tenant_id missing in token. Host: ${hostNoPort}, Resolved Subdomain: ${hostNoPort.split('.')[0]}`
       });
    }

    // If not authenticated, we let it pass to authMiddleware or the handler.
    return;
  }

  // Verify X-Support-Token for Assist Login/Impersonation bypass
  let isImpersonated = false;
  const supportTokenHeader = request.headers['x-support-token'] as string;
  if (supportTokenHeader && supportTokenHeader.startsWith('Bearer ')) {
    try {
      const supportToken = supportTokenHeader.substring(7).trim();
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
      const supportPayload = jwt.verify(supportToken, JWT_SECRET) as any;
      if (supportPayload) {
        const supportRole = supportPayload.roleName || supportPayload.role?.name;
        if (supportRole === 'SUPERADMIN' || supportRole === 'PLATFORM_SUPPORT') {
          isImpersonated = true;
          request.isImpersonated = true;
          if (request.log) {
            request.log.info({
              event: 'AUTH_SUPPORT_IMPERSONATION_VERIFIED',
              supportUser: supportPayload.email,
              targetTenant: jwtTenantId
            }, `[AUTH] Support Impersonation Bypass Granted for ${supportPayload.email} to tenant ${jwtTenantId}`);
          }
        }
      }
    } catch (err) {
      if (request.log) {
        request.log.warn({
          event: 'AUTH_SUPPORT_IMPERSONATION_FAILED',
          error: err instanceof Error ? err.message : String(err)
        }, '[AUTH] Failed to verify X-Support-Token');
      }
    }
  }

  // Mismatch detection between header and JWT (logging only)
  if (tenantIdHeader && tenantIdHeader !== jwtTenantId) {
    // If it's a platform support or superadmin, we might allow mismatch if they explicitly set the header
    if (!systemSuperAdmin && !isImpersonated) {
      try {
        console.warn(JSON.stringify({
          event: 'TENANT_MISMATCH_LOG_ONLY',
          jwtTenant: jwtTenantId,
          headerTenant: tenantIdHeader,
          host: String(request.headers['x-forwarded-host'] || request.headers['host'] || ''),
          userId: request.user?.id || null
        }));
      } catch {}
      // Prioritize JWT Tenant over Header during transition
      request.tenantId = jwtTenantId;
    }
  } else {
    request.tenantId = jwtTenantId || domainTenantId;
  }

  // Enforce that domain tenant matches JWT tenant for non-system SUPERADMIN
  if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenant_id ?? request.user?.tenantId)) {
    const isOrderOrChoosePlan = (() => {
      if (request.method !== 'POST') return false;
      const url = String(request.url || '');
      const path = url.split('?')[0];
      const isOrder = /\/(api(\/v1)?)?\/billing\/subscriptions\/order$/.test(path) || /\/billing\/subscriptions\/order$/.test(path);
      const isChoose = /\/(api(\/v1)?)?\/billing\/subscriptions\/[A-Za-z0-9\-]+\/choose-plan$/.test(path) || /\/billing\/subscriptions\/[A-Za-z0-9\-]+\/choose-plan$/.test(path);
      return isOrder || isChoose;
    })();
    
    // During domain migration, if JWT is present, we TRUST JWT even if domain resolution (hostNoPort)
    // is pointing to a different tenant or fallback domain.
    if (domainTenantId && jwtTenantId && domainTenantId !== jwtTenantId && !isOrderOrChoosePlan) {
      if (isImpersonated) {
        if (request.log) {
          request.log.info('[AUTH] Bypassing tenant-domain mismatch due to valid support impersonation session');
        }
      } else {
        // Log mismatch but allow if JWT is valid for transition
        console.warn(`[TenantMiddleware] Domain/JWT Mismatch: Domain=${domainTenantId}, JWT=${jwtTenantId}. Trusting JWT.`);
        request.tenantId = jwtTenantId;
      }
    }
  }
  
  // Validate tenant ID format (UUID, 'system', or dev demo tenant slugs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isPlatformTenant = request.tenantId === 'system';
  const isDemoSlugTenant = typeof request.tenantId === 'string' && (request.tenantId.startsWith('demo-') || request.tenantId === 'demo');
  const isValidTenantFormat = uuidRegex.test(request.tenantId) || isPlatformTenant || isDemoSlugTenant || (isLocalHost && Boolean(request.tenantId));

  if (!isValidTenantFormat && !(systemSuperAdmin && allowNonUuidForSuperadminLocal)) {
    return reply.status(400).send({
      error: 'Invalid tenant ID',
      message: 'X-Tenant-ID must be a valid UUID'
    });
  }

  // Tenant Existence & Status Enforcement (Kill Switch)
  // Ensure tenant exists and is not SUSPENDED/DELETED before proceeding
  if (!systemSuperAdmin && request.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: request.tenantId },
      select: { id: true, status: true }
    });

    if (!tenant) {
      return reply.status(404).send({
        error: 'Tenant Not Found',
        message: 'Tenant does not exist.'
      });
    }

    if (tenant.status === 'SUSPENDED' || tenant.status === 'DELETED') {
      // Allow request-deletion and cancel-deletion even if suspended
      const isDeletionFlow = urlPath.endsWith('/request-deletion') || urlPath.endsWith('/cancel-deletion');
      if (!isDeletionFlow) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Tenant is suspended'
        });
      }
    }
  }

  // Subscription Enforcement (Centralized)
  // Using subscriptionGuard to enforce ACTIVE/TRIAL status logic
  // This replaces the previous "Patch 2" logic with the unified guard
  await subscriptionGuard(request, reply);
  if (reply.sent) return;
}
