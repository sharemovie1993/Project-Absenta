import { tenantEntitlementService } from '../modules/billing/services/tenant-entitlement.service';
import { ModuleCapability, DEFAULT_CAPABILITIES } from '../constants/capabilities';

export async function getTenantCapabilities(tenantId: string): Promise<ModuleCapability[]> {
  try {
    const features = await tenantEntitlementService.resolveTenantFeatures(tenantId);
    
    // Map string features to ModuleCapability enum
    const result = features.map(f => f.toUpperCase())
      .filter(f => Object.values(ModuleCapability).includes(f as ModuleCapability)) as ModuleCapability[];
    
    // Ensure CORE is always there if not present (though resolveTenantFeatures should include it)
    if (!result.includes(ModuleCapability.CORE)) {
      result.push(ModuleCapability.CORE);
    }
    
    return result;
  } catch (error) {
    console.error(`[Capability] Error fetching capabilities for tenant ${tenantId}:`, error);
    return DEFAULT_CAPABILITIES;
  }
}
