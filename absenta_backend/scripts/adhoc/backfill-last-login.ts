import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill for last_login...');

  // Strategy:
  // 1) Try to find last ActivityLog with action containing 'LOGIN' per user.
  // 2) If none found, keep last_login as null.

  const users = await prisma.user.findMany({
    select: { id: true, tenant_id: true }
  });

  let updated = 0;

  for (const user of users) {
    // Find last login activity if exists
    const lastLoginLog = await prisma.activityLog.findFirst({
      where: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        OR: [
          { action: { contains: 'LOGIN', mode: 'insensitive' } },
          { entity: { contains: 'LOGIN', mode: 'insensitive' } }
        ]
      },
      orderBy: { timestamp: 'desc' }
    });

    const lastLogin = lastLoginLog?.timestamp ?? null;

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: lastLogin }
    });

    updated++;
  }

  console.log(`Backfill completed. Users updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

