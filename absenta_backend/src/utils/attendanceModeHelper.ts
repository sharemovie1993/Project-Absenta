import { prisma } from './prisma';
import { AbsensiMode } from '@prisma/client';

/**
 * Resolves the effective attendance mode for a tenant.
 * It checks the active subscription for the 'ABSENSI' service first,
 * and falls back to the tenant's static absensi_mode in the database.
 * If there is a mismatch, it schedules a background sync to correct the Tenant table.
 * 
 * @param tenantId - The UUID of the tenant
 * @returns The resolved AbsensiMode (SIMPLE or MULTI_SESI)
 */
export async function getEffectiveAbsensiMode(tenantId: string): Promise<AbsensiMode> {
  if (!tenantId || tenantId === 'system') {
    return AbsensiMode.SIMPLE;
  }

  try {
    // 1. Fetch active subscription for ABSENSI service
    const activeSub = await prisma.subscription.findFirst({
      where: {
        tenant_id: tenantId,
        service_code: 'ABSENSI',
        status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT', 'UPGRADE_PENDING'] as any }
      },
      include: { Plan: true }
    });

    if (activeSub && activeSub.Plan) {
      const mode = activeSub.Plan.absensi_mode as AbsensiMode;
      
      // Auto-sync: update Tenant table in the background if there's a mismatch
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { absensi_mode: true }
      }).then(tenant => {
        if (tenant && tenant.absensi_mode !== mode) {
          prisma.tenant.update({
            where: { id: tenantId },
            data: { absensi_mode: mode }
          }).catch(err => console.error('Failed to sync tenant mode:', err));
        }
      }).catch(err => console.error('Failed to check tenant mode for sync:', err));

      return mode;
    }
  } catch (err) {
    console.error('Error resolving attendance mode from subscription:', err);
  }

  // 2. Fallback to Tenant table
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true }
    });
    return tenant?.absensi_mode || AbsensiMode.SIMPLE;
  } catch (err) {
    console.error('Error fetching tenant static attendance mode:', err);
    return AbsensiMode.SIMPLE;
  }
}
