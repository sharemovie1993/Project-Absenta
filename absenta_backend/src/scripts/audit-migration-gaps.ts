import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Gunakan raw query untuk cek semua tabel yang punya tenant_id
  const tables = await prisma.$queryRaw<{table_name: string}[]>`
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
    AND table_schema = 'public' 
    ORDER BY table_name;
  `;
  
  console.log(`Total tabel dengan tenant_id: ${tables.length}`);
  
  const OLD_ID = 'demo-tenant-absenta';
  const NEW_ID = '2acb7e12-d264-4784-8262-8f7369061542';
  
  for (const t of tables) {
    const tbl = t.table_name;
    // Count di old
    const oldRes = await prisma.$queryRawUnsafe<{count: bigint}[]>(
      `SELECT COUNT(*) as count FROM "${tbl}" WHERE tenant_id = '${OLD_ID}'`
    );
    const newRes = await prisma.$queryRawUnsafe<{count: bigint}[]>(
      `SELECT COUNT(*) as count FROM "${tbl}" WHERE tenant_id = '${NEW_ID}'`
    );
    const oldCount = Number(oldRes[0].count);
    const newCount = Number(newRes[0].count);
    
    const status = oldCount > 0 && newCount === 0 ? '❌ BELUM MIGRASI' :
                   oldCount > 0 && newCount > 0 ? '✅ sudah ada' :
                   oldCount === 0 && newCount > 0 ? '🆕 hanya di baru' :
                   '⚪ kosong keduanya';
    
    if (oldCount > 0 || newCount > 0) {
      console.log(`${status} | ${tbl.padEnd(40)} | lama: ${oldCount} | baru: ${newCount}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
