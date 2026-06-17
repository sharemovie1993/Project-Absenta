import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient() as any;

async function main() {
  const sqlPath = path.join(process.cwd(), 'prisma', 'manual_migrations', '2026-03-01_add_parent_fcm_token.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    return;
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log('Executing manual migration ParentFcmToken...');
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('Manual migration executed.');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
