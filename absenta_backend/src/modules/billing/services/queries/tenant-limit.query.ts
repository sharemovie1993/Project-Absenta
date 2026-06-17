import { SubscriptionStatus } from '@prisma/client';
import { subscriptionDb as prisma } from '../repositories/subscription.db';

export async function checkTenantLimitQuery(tenantId: string, resource: 'students' | 'users' = 'students', increment: number = 1): Promise<void> {
  const activeSubs = await prisma.subscription.findMany({
    where: {
      tenant_id: tenantId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, 'UPGRADE_PENDING' as any] },
    },
    include: { Plan: true },
    orderBy: { created_at: 'desc' },
  });

  if (activeSubs.length === 0) {
    throw new Error('No active subscription found.');
  }

  // Pick the subscription with the highest limit for this tenant
  // In a modular SaaS, a tenant might have multiple active subscriptions (e.g., Core + Absensi + WhatsApp)
  // We should respect the highest capacity they have purchased.
  const sub = activeSubs.reduce((prev, current) => {
    const prevLimit = (prev.Plan as any)?.max_user === null ? Infinity : ((prev.Plan as any)?.max_user || 0);
    const currentLimit = (current.Plan as any)?.max_user === null ? Infinity : ((current.Plan as any)?.max_user || 0);
    return currentLimit > prevLimit ? current : prev;
  }, activeSubs[0]);

  const limit = (sub as any).Plan.max_user;
  if (limit === null) return;

  if (resource === 'students') {
    const count = await (prisma as any).siswa.count({
      where: {
        tenant_id: tenantId,
        status: 'AKTIF',
      },
    });

    if (count + increment > limit) {
      throw new Error(
        `Batas kuota tercapai. Paket Anda (${(sub as any).Plan.name}) hanya mendukung ${limit} siswa. Saat ini: ${count}, Akan ditambahkan: ${increment}`,
      );
    }
  }
}

