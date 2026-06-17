import { prisma } from '@/utils/prisma';
import { FeatureState } from '@/types/feature-state';
import { cacheService } from '@/utils/cache.service';

/**
 * 🚀 Feature State Resolver Service
 * Menentukan status layanan tenant secara konsisten dan teroptimasi.
 * Menggunakan caching untuk performa tinggi pada aplikasi SaaS.
 */
export const featureStateResolver = {
  private_CACHE_TTL: 300, // 5 menit

  /**
   * Resolves the feature state for a tenant and feature key.
   * @param tenantId The ID of the tenant
   * @param feature The feature key (e.g., 'ABSENSI', 'KOPERASI')
   * @returns FeatureState
   */
  async resolveFeatureState(tenantId: string, feature: string | null): Promise<FeatureState> {
    // CORE features are always ACTIVE
    if (!feature || feature === 'CORE') return FeatureState.ACTIVE;

    const cacheKey = `feature_state:${tenantId}:${feature}`;
    
    // ⚡ Try Cache first
    const cached = await cacheService.get<FeatureState>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    
    // 🔍 Find all subscriptions for the tenant to check features
    const subscriptions = await prisma.subscription.findMany({
      where: {
        tenant_id: tenantId,
      },
      include: { 
        Plan: true 
      },
      orderBy: { 
        end_date: 'desc' 
      },
    });

    // Find the most relevant subscription that contains this feature
    const relevantSub = subscriptions.find(sub => {
      const plan = (sub as any).Plan;
      const mid = plan?.module_id ? String(plan.module_id).toUpperCase() : null;
      const features = Array.isArray(plan?.features_json) ? (plan.features_json as string[]).map(f => String(f).toUpperCase()) : [];
      
      return mid === feature || features.includes(String(feature).toUpperCase());
    });

    let state: FeatureState = FeatureState.LOCKED;

    if (relevantSub) {
      const status = relevantSub.status;
      const isExpired = relevantSub.end_date <= now;

      if (status === 'TRIAL' && !isExpired) {
        state = FeatureState.TRIAL;
      } else if ((status === 'ACTIVE' || status === 'UPGRADE_PENDING') && !isExpired) {
        state = FeatureState.ACTIVE;
      } else if (status === 'EXPIRED' || isExpired) {
        state = FeatureState.EXPIRED;
      }
    }

    // 📥 Store in cache
    await cacheService.set(cacheKey, state, this.private_CACHE_TTL);

    return state;
  }
};

