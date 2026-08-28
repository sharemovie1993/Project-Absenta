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
  fastify.addHook('preHandler', async (_request: any, _reply: any) => {
    // [DISABLED] SaaS Feature Entitlement Guard dinonaktifkan sepenuhnya
    return;
  });
});


