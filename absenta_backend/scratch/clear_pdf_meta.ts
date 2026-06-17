
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.invoice.updateMany({
    where: {
      OR: [
        { pdf_storage_key: { not: null } },
        { pdf_path: { not: null } }
      ]
    },
    data: {
      pdf_storage_key: null,
      pdf_path: null,
      pdf_sha256: null,
      pdf_generated_at: null,
      pdf_size_bytes: null
    }
  });
  console.log(`Cleared PDF data for ${count.count} invoices.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
