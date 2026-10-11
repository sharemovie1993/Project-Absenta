import { prisma } from './prisma';
import { AbsensiMode } from '@prisma/client';

/**
 * Resolves the attendance mode based on plan details (id, name, features_json)
 * Handles standalone ABSENSI as well as PAKET_LENGKAP variations.
 */
export function resolvePlanAbsensiMode(plan: any): AbsensiMode {
  if (!plan) return AbsensiMode.MULTI_SESI;

  const idUpper = String(plan.id || plan.code || '').toUpperCase();
  const nameUpper = String(plan.name || '').toUpperCase();

  let features: string[] = [];
  if (Array.isArray(plan.features_json)) {
    features = plan.features_json.map((f: any) => String(f).toUpperCase());
  } else if (typeof plan.features_json === 'string') {
    try {
      const parsed = JSON.parse(plan.features_json);
      if (Array.isArray(parsed)) features = parsed.map((f: any) => String(f).toUpperCase());
    } catch {}
  }

  // 1. Indikator tegas Multi Sesi (KBM, Jadwal Pelajaran, atau tag MULTI)
  if (
    idUpper.includes('MULTI') || 
    nameUpper.includes('MULTI') || 
    features.some(f => f.includes('MULTI_SESI') || f.includes('MATA PELAJARAN') || f.includes('JADWAL KURIKULUM'))
  ) {
    return AbsensiMode.MULTI_SESI;
  }

  // 2. Indikator tegas Simple / Presensi Harian Standar
  if (
    idUpper.includes('SIMPLE') || 
    nameUpper.includes('SIMPLE') || 
    features.some(f => f.includes('ABSENSI-SIMPLE'))
  ) {
    return AbsensiMode.SIMPLE;
  }

  // 3. Fallback ke nilai kolom absensi_mode pada Plan jika sudah valid
  if (plan.absensi_mode === AbsensiMode.MULTI_SESI || plan.absensi_mode === AbsensiMode.SIMPLE) {
    return plan.absensi_mode as AbsensiMode;
  }

  return AbsensiMode.MULTI_SESI;
}

/**
 * Resolves the effective attendance mode for a tenant.
 * It checks active subscriptions for 'ABSENSI' or 'PAKET_LENGKAP' service first,
 * resolves the accurate mode with intelligent inference and auto-heals any stale plan/tenant records.
 * Falls back to the tenant's static absensi_mode in the database.
 * 
 * @param tenantId - The UUID of the tenant
 * @returns The resolved AbsensiMode (SIMPLE or MULTI_SESI)
 */
export async function getEffectiveAbsensiMode(tenantId: string): Promise<AbsensiMode> {
  if (!tenantId || tenantId === 'system') {
    return AbsensiMode.MULTI_SESI;
  }

  try {
    // 1. Fetch active subscription for ABSENSI or PAKET_LENGKAP service
    const activeSub = await prisma.subscription.findFirst({
      where: {
        tenant_id: tenantId,
        service_code: { in: ['ABSENSI', 'PAKET_LENGKAP'] },
        status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT', 'UPGRADE_PENDING'] as any }
      },
      include: { Plan: true },
      orderBy: [
        { service_code: 'asc' }, // Prioritaskan 'ABSENSI' spesifik baru 'PAKET_LENGKAP'
        { created_at: 'desc' }
      ]
    });

    if (activeSub && activeSub.Plan) {
      const mode = resolvePlanAbsensiMode(activeSub.Plan);
      
      // Auto-heal Plan table if mismatched
      if (activeSub.Plan.absensi_mode !== mode) {
        prisma.plan.update({
          where: { id: activeSub.Plan.id },
          data: { absensi_mode: mode }
        }).catch(err => console.error('[attendanceModeHelper] Failed to auto-heal plan absensi_mode:', err));
      }

      // Auto-sync: update Tenant table in the background if there's a mismatch
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { absensi_mode: true }
      }).then(tenant => {
        if (tenant && tenant.absensi_mode !== mode) {
          prisma.tenant.update({
            where: { id: tenantId },
            data: { absensi_mode: mode }
          }).catch(err => console.error('[attendanceModeHelper] Failed to sync tenant mode:', err));
        }
      }).catch(err => console.error('[attendanceModeHelper] Failed to check tenant mode for sync:', err));

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
    return tenant?.absensi_mode || AbsensiMode.MULTI_SESI;
  } catch (err) {
    console.error('Error fetching tenant static attendance mode:', err);
    return AbsensiMode.MULTI_SESI;
  }
}

