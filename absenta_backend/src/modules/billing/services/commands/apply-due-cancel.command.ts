import { subscriptionDb as prisma } from '../repositories/subscription.db';

export async function applyDueCancelForSubscriptionCommand(subscriptionId: string, now: Date) {
  const req = await prisma.planChangeRequest.findFirst({
    where: {
      subscription_id: subscriptionId,
      status: 'SCHEDULED' as any,
      change_type: 'CANCEL' as any,
      effective_date: { lte: now },
    },
    orderBy: { effective_date: 'asc' },
  });

  if (!req) return null;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED' as any,
        auto_renew: false,
        cancel_date: now,
      },
    });
    await tx.planChangeRequest.update({
      where: { id: (req as any).id },
      data: { status: 'APPLIED' as any },
    });
  });

  return req;
}

