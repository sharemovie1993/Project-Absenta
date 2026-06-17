import fp from 'fastify-plugin';
import { ServiceFeatureMap } from '@/config/service-feature-map';
import { featureStateResolver } from '@/services/feature-state-resolver.service';
import { FeatureState } from '@/types/feature-state';
import { isSystemSuperAdmin } from '@/utils/rbac';

function getRouteConfig(request: any): any {
  return (
    request?.routeOptions?.config ||
    request?.context?.config ||
    request?.routeConfig ||
    {}
  );
}

function extractModuleFromUrl(url: string): string {
  const clean = String(url || '').split('?')[0];
  const normalized = clean.startsWith('/') ? clean : `/${clean}`;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts[0] !== 'api') return parts[0] || '';
  return parts[1] || '';
}

export const serviceFeatureGuard = fp(async (fastify: any) => {
  fastify.addHook('preHandler', async (request: any, reply: any) => {
    const config = getRouteConfig(request);
    if (config?.public === true || config?.skipAuth === true) return;

    const user = request.user;
    const roleName = user?.roleName || user?.Role?.name || user?.role?.name;
    const userTenantId = user?.tenantId || user?.tenant_id;
    if (isSystemSuperAdmin(roleName, userTenantId ?? null)) return;

    if (request.skipTenant) return;

    const tenantId = request.tenantId || userTenantId;
    if (!tenantId) return;

    const moduleKey =
      typeof config?.module === 'string' && config.module.trim().length > 0
        ? config.module.trim()
        : extractModuleFromUrl(request.url);

    const requiredFeature = ServiceFeatureMap[moduleKey] || 'CORE';
    const state = await featureStateResolver.resolveFeatureState(String(tenantId), requiredFeature);
    
    if (state === FeatureState.ACTIVE || state === FeatureState.TRIAL) return;

    // LOCKED or EXPIRED: allow GET (Preview Mode), block mutations
    if (request.method === 'GET') return;

    try {
      console.warn(
        JSON.stringify({
          event: 'SERVICE_FEATURE_NOT_ENABLED',
          tenantId,
          module: moduleKey,
          requiredFeature,
          featureState: state,
          method: request.method,
          url: request.url,
          userId: user?.id ?? null,
        })
      );
    } catch {}

    reply.code(403).send({
      code: 'FEATURE_NOT_ENABLED',
      message: state === FeatureState.EXPIRED 
        ? 'Masa aktif fitur ini telah berakhir. Silakan perpanjang paket Anda.'
        : 'Fitur ini belum aktif pada paket Anda.',
    });
  });
});

