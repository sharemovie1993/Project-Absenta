import { useAuth } from './useAuth';

/**
 * Custom hook untuk mengelola tenant
 * Wrapper untuk tenant-related functionality dari useAuth
 */
export const useTenant = () => {
  const { tenantId, getCurrentTenantId, user } = useAuth();

  /**
   * Get current tenant ID
   */
  const currentTenantId = getCurrentTenantId();

  /**
   * Get tenant information from user data
   * Since user only has tenant_id, we create a minimal tenant object
   */
  const tenant = user?.tenant_id ? { id: user.tenant_id } : null;

  /**
   * Check if user has access to specific tenant
   */
  const hasAccessToTenant = (targetTenantId: string): boolean => {
    return currentTenantId === targetTenantId;
  };

  /**
   * Check if current user is in a valid tenant context
   */
  const isValidTenantContext = (): boolean => {
    return !!currentTenantId && !!tenant;
  };

  return {
    tenantId: currentTenantId,
    tenant,
    hasAccessToTenant,
    isValidTenantContext,
  };
};

export default useTenant;