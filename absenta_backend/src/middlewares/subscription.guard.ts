import { prisma } from '../utils/prisma';
import { isSystemSuperAdmin } from '../utils/rbac';
import { tenantEntitlementService } from '../modules/billing/services/tenant-entitlement.service';

function getRouteConfig(request: any): any {
  return (
    (request as any)?.routeOptions?.config ||
    (request as any)?.context?.config ||
    (request as any)?.routeConfig ||
    {}
  );
}

async function checkCooperativeTrialLimit(
  tenantId: string,
  path: string
): Promise<{ allowed: boolean; count: number; limit: number; entityName: string }> {
  const limit = 10;
  const p = path.toLowerCase();

  try {
    if (p.includes('/announcements')) {
      const count = await prisma.announcement.count({ where: { tenantId } });
      return { allowed: count < limit, count, limit, entityName: 'Pengumuman' };
    }
    if (p.includes('/members')) {
      const count = await prisma.member.count({ where: { tenantId } });
      return { allowed: count < limit, count, limit, entityName: 'Anggota Koperasi' };
    }
    if (p.includes('/savings') && !p.includes('/saving-categories')) {
      const count = await prisma.saving.count({ where: { member: { tenantId } } });
      return { allowed: count < limit, count, limit, entityName: 'Akun Simpanan' };
    }
    if (p.includes('/loans')) {
      const count = await prisma.loan.count({ where: { member: { tenantId } } });
      return { allowed: count < limit, count, limit, entityName: 'Pengajuan Pinjaman' };
    }
    if (p.includes('/products') || p.includes('/toko')) {
      const count = await prisma.product.count({ where: { tenantId } });
      return { allowed: count < limit, count, limit, entityName: 'Barang Toko' };
    }
    if (p.includes('/tickets')) {
      const count = await prisma.ticket.count({ where: { tenantId } });
      return { allowed: count < limit, count, limit, entityName: 'Tiket Bantuan' };
    }
    if (p.includes('/suppliers')) {
      const count = await prisma.coopSupplier.count({ where: { tenantId } });
      return { allowed: count < limit, count, limit, entityName: 'Pemasok/Supplier' };
    }
    if (p.includes('/vouchers')) {
      const count = await prisma.voucher.count({ where: { tenantId } });
      return { allowed: count < limit, count, limit, entityName: 'Voucher' };
    }
  } catch (err) {
    console.error('[Trial Quota Check Warning]', err);
  }

  return { allowed: true, count: 0, limit, entityName: 'Data' };
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
    path.startsWith('/api/me') ||
    path.includes('/backup') ||
    path.includes('/backups') ||
    path.includes('/restore') ||
    path.includes('/purge-tenant') ||
    path.includes('/send-logout-wa') ||
    path.includes('/activity-logs');

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
    // 1. Check resolved tenant features from active plans and entitlements
    const features = await tenantEntitlementService.resolveTenantFeatures(tenantId);
    const upperFeatures = features.map(f => f.toUpperCase());

    const SERVICE_ALIASES: Record<string, string[]> = {
      KOPERASI: ['KOPERASI', 'COOPERATIVE', 'COOP'],
      ABSENSI: ['ABSENSI', 'ATTENDANCE', 'ATTENDANCE_OPS'],
      HUBIN: ['HUBIN', 'BKK', 'PRAKERIN'],
      SARPRAS: ['SARPRAS', 'ASSET'],
      RAPOR: ['RAPOR', 'REPORTING', 'NILAI'],
    };

    const targetAliases = SERVICE_ALIASES[requiredServiceCode] || [requiredServiceCode];
    const isEntitled = targetAliases.some(alias => upperFeatures.includes(alias));

    if (!isEntitled) {
      // 2. Fallback check for direct subscription record by service_code
      const svc = await prisma.subscription.findFirst({
        where: { 
          tenant_id: tenantId, 
          service_code: { in: targetAliases as any } 
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, status: true, end_date: true },
      });

      if (!isValidSubscription(svc)) {
        // TRIAL EVALUATION POLICY:
        // Allows tenants to evaluate modules (Maksimal 10 Record CRUD).
        const method = String(request.method || 'GET').toUpperCase();
        
        if (requiredServiceCode === 'KOPERASI') {
          if (method === 'POST') {
            const quota = await checkCooperativeTrialLimit(tenantId, path);
            if (!quota.allowed) {
              return reply.status(403).send({
                error: 'Trial Quota Exceeded',
                reason: `TRIAL_LIMIT_EXCEEDED_${requiredServiceCode}`,
                message: `Batas kuota percobaan tercapai (${quota.count}/${quota.limit} ${quota.entityName}). Anda telah mencapai batas maksimal 10 data untuk mode uji coba. Silakan berlangganan modul Koperasi untuk pencatatan tanpa batas.`,
              });
            }
          }
          // Permit evaluation GET, PUT, PATCH, DELETE, and POST under quota limit
          request.isTrialMode = true;
          request.trialServiceCode = requiredServiceCode;
          return;
        }

        return reply.status(403).send({
          error: 'Subscription Required',
          reason: `SUBSCRIPTION_REQUIRED_${requiredServiceCode}`,
          message: `Subscription for service ${requiredServiceCode} is required or not active.`,
        });
      }
    }
  }

  return;
}
