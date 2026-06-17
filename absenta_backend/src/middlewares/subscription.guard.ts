import { prisma } from '@/utils/prisma';
import { isSystemSuperAdmin } from '@/utils/rbac';

function getRouteConfig(request: any): any {
  return (
    (request as any)?.routeOptions?.config ||
    (request as any)?.context?.config ||
    (request as any)?.routeConfig ||
    {}
  );
}

export async function subscriptionGuard(
  request: any,
  reply: any
) {
  const user = request.user;
  if (!user) return; // Should be handled by auth middleware, but just in case

  const roleName = user.roleName || user.role?.name;
  // Prioritize request.tenantId (resolved by tenantMiddleware) over user.tenantId (JWT)
  const tenantId = request.tenantId || user.tenantId || user.tenant_id;
  if (!tenantId) return;

  // Skip subscription check for system superadmin, platform staff, or support impersonation sessions
  const isPlatformUser = tenantId === 'system';
  const isImpersonated = request.isImpersonated === true;
  if (isSystemSuperAdmin(roleName, tenantId) || isPlatformUser || isImpersonated) {
    return;
  }

  const url = String(request.url || '');
  const path = url.split('?')[0];

  const routeConfig = getRouteConfig(request);
  const billingByFlag = routeConfig && routeConfig.billing === true;
  const billingByPath =
    path.startsWith('/billing') ||
    path.startsWith('/api/billing') ||
    path.startsWith('/api/v1/billing') ||
    path.startsWith('/subscriptions') ||
    path.startsWith('/api/subscriptions') ||
    path.startsWith('/api/v1/subscriptions') ||
    path.startsWith('/invoice') ||
    path.startsWith('/api/invoice') ||
    path.startsWith('/api/v1/invoice') ||
    path.startsWith('/payment') ||
    path.startsWith('/api/payment') ||
    path.startsWith('/api/v1/payment') ||
    path.startsWith('/payments') ||
    path.startsWith('/api/payments') ||
    path.startsWith('/api/v1/payments');

  const whitelistedPaths =
    path.startsWith('/auth') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/v1/auth') ||
    path.startsWith('/notifications') ||
    path.startsWith('/api/notifications') ||
    path.startsWith('/api/v1/notifications') ||
    path.startsWith('/system') ||
    path.startsWith('/api/system') ||
    path.startsWith('/api/menu') ||
    path.startsWith('/api/tenants') ||
    path.startsWith('/api/my-subscription') ||
    path.startsWith('/api/me');

  if (billingByFlag || billingByPath || whitelistedPaths) return;

  const requiredServiceCode = (() => {
    if (path.startsWith('/api/attendance')) return 'ABSENSI';
    if (path.startsWith('/api/cooperative')) return 'KOPERASI';
    return null;
  })();

  const isValidSubscription = (sub: { status: any; end_date: any } | null) => {
    if (!sub) return false;
    if (sub.status === 'ACTIVE') return true;
    if (sub.status === 'TRIAL') {
      const now = new Date();
      const end = sub.end_date ? new Date(sub.end_date) : null;
      if (!end) return false;
      return end.getTime() > now.getTime();
    }
    return false;
  };

  // MULTI-SERVICE FIX: Check for ANY active subscription (not just 'CORE')
  // In multi-service SaaS, having any active subscription grants base platform access.
  // The per-service check below handles feature-specific access.
  const anySub = await prisma.subscription.findFirst({
    where: { 
      tenant_id: tenantId, 
      status: { in: ['ACTIVE', 'TRIAL'] as any },
    },
    orderBy: { created_at: 'desc' },
    select: { id: true, status: true, end_date: true },
  });

  if (!isValidSubscription(anySub)) {
    return reply.status(403).send({
      error: 'Subscription Required',
      reason: 'SUBSCRIPTION_REQUIRED',
      message: 'An active subscription is required. Please subscribe to continue.',
    });
  }

  if (requiredServiceCode) {
    const svc = await prisma.subscription.findFirst({
      where: { tenant_id: tenantId, service_code: requiredServiceCode },
      orderBy: { created_at: 'desc' },
      select: { id: true, status: true, end_date: true },
    });

    if (!isValidSubscription(svc)) {
      return reply.status(403).send({
        error: 'Subscription Required',
        reason: `SUBSCRIPTION_REQUIRED_${requiredServiceCode}`,
        message: `Subscription for service ${requiredServiceCode} is required or not active.`,
      });
    }
  }

  return;
}
