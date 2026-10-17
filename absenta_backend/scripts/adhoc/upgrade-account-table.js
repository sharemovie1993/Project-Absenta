const { PrismaClient } = require('../../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Upgrading Account table in PostgreSQL...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isHeader" BOOLEAN NOT NULL DEFAULT false;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "parentId" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Account_tenantId_parentId_idx" ON "Account"("tenantId", "parentId");`);
  console.log('Account table successfully upgraded!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Failed to upgrade Account table:', err);
    process.exit(1);
  });
