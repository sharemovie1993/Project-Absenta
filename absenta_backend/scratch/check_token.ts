
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const t = '3191f76dae23b9c9a5a9411fcdbc1f85ea2e4c16495db7d49c1bd58e8d301864';
const tokenHash = createHash('sha256').update(t).digest('hex');

async function main() {
  const act = await p.activityLog.findFirst({
    where: {
      action: { in: ['INVOICE_PUBLIC_VIEW', 'INVOICE_PUBLIC_PDF_DOWNLOAD'] as any },
      metadata: { contains: tokenHash }
    },
    orderBy: { created_at: 'desc' }
  });
  console.log('ActivityLog entry:', JSON.stringify(act));
}

main().catch(console.error).finally(() => p.$disconnect());
