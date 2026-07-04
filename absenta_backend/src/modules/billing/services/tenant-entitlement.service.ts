import { prisma } from '@/utils/prisma';
import { getRedisConnection } from '@/infra/redis/redisClient';

const CACHE_TTL_SECONDS = 60;

function normalizeFeature(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toUpperCase();
  return v ? v : null;
}

export const tenantEntitlementService = {
  async resolveTenantFeatures(tenantId: string): Promise<string[]> {
    const t = String(tenantId || '').trim();
    if (!t) return ['CORE'];

    const cacheKey = `tenant:features:${t}`;
    const redis: any = (() => {
      try {
        return getRedisConnection();
      } catch {
        return null;
      }
    })();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map(normalizeFeature).filter(Boolean) as string[];
            if (normalized.length > 0) return Array.from(new Set(normalized));
          }
        }
      } catch {}
    }

    // Check if there is a custom grace period in database config
    let graceDays = 7;
    const configGrace = await prisma.config.findFirst({
      where: { tenant_id: t, key: 'subscription_grace_days' }
    });
    if (configGrace && configGrace.value) {
      const parsedDays = parseInt(configGrace.value);
      if (!isNaN(parsedDays)) graceDays = parsedDays;
    }

    const now = new Date();
    const graceThreshold = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        tenant_id: t,
        status: { in: ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'] as any },
        end_date: { gt: graceThreshold },
      },
      include: { Plan: true },
      orderBy: { end_date: 'desc' },
    });

    const featureSet = new Set<string>(['CORE']);
    for (const sub of subscriptions) {
      const plan = (sub as any).Plan;
      
      // 1. Auto-inject Module ID as a master feature switch
      const mid = normalizeFeature(plan?.module_id);
      if (mid) featureSet.add(mid);

      // 2. Process granular features from features_json
      const raw = plan?.features_json;
      if (!Array.isArray(raw)) continue;
      for (const f of raw) {
        const nf = normalizeFeature(f);
        if (nf) featureSet.add(nf);
      }
    }

    const resolved = Array.from(featureSet);

    if (redis) {
      try {
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(resolved));
      } catch {}
    }

    return resolved;
  },

  async invalidateTenantFeaturesCache(tenantId: string): Promise<void> {
    const t = String(tenantId || '').trim();
    if (!t) return;
    const redis: any = (() => {
      try {
        return getRedisConnection();
      } catch {
        return null;
      }
    })();
    if (!redis) return;
    try {
      await redis.del(`tenant:features:${t}`);
    } catch {}
  },
};

