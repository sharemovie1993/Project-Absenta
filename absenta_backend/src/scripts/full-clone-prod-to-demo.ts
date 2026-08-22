/**
 * FULL CLONE: Clone 360° dari tenant produksi ke demo
 * Menggunakan raw SQL murni tanpa hardcode field names
 * Source: 8535b49c-d3fc-4598-922a-7774b49ee7c5 (SMKN 1 Plered)
 * Target: 2acb7e12-d264-4784-8262-8f7369061542 (Demo)
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

// Daftar tabel yang TIDAK boleh di-clone (sudah di-migrate atau tidak perlu)
const SKIP_TABLES = new Set([
  'Tenant', 'User', 'Role', 'RolePermission', 'Permission',
  'ActivityLog', 'ActivityLogDetail',
  'Subscription', 'SubscriptionHistory', 'SubscriptionAddon',
  'PlanChangeRequest', 'Plan', 'PlanAddon', 'Module',
  'Guru', 'Siswa',
  'OrganizationalPosition', 'OrganizationalAssignment',
  'TahunPelajaran', 'Jurusan', 'Kelas', 'Semester',
  'WaTenantConnection', 'WaAuthSession', 'WaLidMapping',
  // Tabel yang tidak perlu di demo
  'SKWaliKelasArsip',
]);

// Tabel yang sudah ada datanya di demo (skip jika ada)
const SKIP_IF_EXISTS = new Set([
  'Mapel', 'JenisKegiatanMaster', 'KelasMapel', 'GuruMapel',
  'JadwalKBM', 'JadwalKontrakKbm',
]);


async function getTablesWithTenantId(): Promise<string[]> {
  const res = await prisma.$queryRaw<{table_name: string}[]>`
    SELECT DISTINCT table_name FROM information_schema.columns 
    WHERE column_name = 'tenant_id' AND table_schema = 'public' 
    ORDER BY table_name;
  `;
  return res.map(r => r.table_name);
}

async function countRows(tableName: string, tenantId: string): Promise<number> {
  const res = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "${tableName}" WHERE tenant_id = $1`, tenantId
  );
  return Number(res[0].count);
}

async function cloneTable(tableName: string): Promise<{inserted: number, skipped: number}> {
  const prodCount = await countRows(tableName, PROD_ID);
  if (prodCount === 0) return {inserted: 0, skipped: 0};

  const demoCount = await countRows(tableName, DEMO_ID);
  if (demoCount > 0 && SKIP_IF_EXISTS.has(tableName)) {
    return {inserted: 0, skipped: demoCount};
  }

  // Ambil semua baris dari produksi
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "${tableName}" WHERE tenant_id = $1`, PROD_ID
  );
  
  if (rows.length === 0) return {inserted: 0, skipped: 0};

  const columns = Object.keys(rows[0]);
  let inserted = 0;

  for (const row of rows) {
    // Ganti id dan tenant_id
    const newId = randomUUID();
    const newRow: Record<string, any> = {};
    
    for (const col of columns) {
      if (col === 'id') {
        newRow[col] = newId;
      } else if (col === 'tenant_id') {
        newRow[col] = DEMO_ID;
      } else {
        newRow[col] = row[col]; // Salin apa adanya (FK ke tabel lain diabaikan dulu)
      }
    }

    const cols = columns.map(c => `"${c}"`).join(', ');
    const vals = columns.map(c => newRow[c]);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        ...vals
      );
      inserted++;
    } catch (_e) {
      // Ignore constraint violations
    }
  }

  return {inserted, skipped: 0};
}

async function main() {
  console.log(`🚀 FULL CLONE 360°: Produksi -> Demo`);
  console.log(`   Sumber : ${PROD_ID}`);
  console.log(`   Target : ${DEMO_ID}\n`);

  const tables = await getTablesWithTenantId();
  console.log(`📊 Total tabel dengan tenant_id: ${tables.length}`);
  
  // Pisahkan tabel yang skip
  const toClone = tables.filter(t => !SKIP_TABLES.has(t));
  console.log(`📋 Tabel yang akan di-clone: ${toClone.length}`);
  console.log(`⏭️  Tabel yang di-skip: ${tables.filter(t => SKIP_TABLES.has(t)).length}\n`);

  let totalInserted = 0;
  let totalFailed = 0;
  const results: {table: string, inserted: number, prod: number}[] = [];

  for (const tableName of toClone) {
    try {
      const prodCount = await countRows(tableName, PROD_ID);
      if (prodCount === 0) continue; // Tidak ada data di produksi, skip

      const {inserted, skipped} = await cloneTable(tableName);
      
      if (inserted > 0) {
        console.log(`   ✅ ${String(inserted).padStart(5)} baris | ${tableName} (dari ${prodCount})`);
        totalInserted += inserted;
        results.push({table: tableName, inserted, prod: prodCount});
      } else if (skipped > 0) {
        console.log(`   ⏭️  ${String(skipped).padStart(5)} ada   | ${tableName} (skip, sudah ada)`);
      } else {
        console.log(`   ⚠️  ${String(0).padStart(5)} baris | ${tableName} (${prodCount} di produksi, 0 berhasil - FK conflict?)`);
        totalFailed++;
      }
    } catch (e: any) {
      console.log(`   ❌ Error | ${tableName}: ${e.message?.slice(0, 80)}`);
      totalFailed++;
    }
  }

  // Flush redis
  console.log(`\n📊 RINGKASAN:`);
  console.log(`   Total baris berhasil di-clone : ${totalInserted}`);
  console.log(`   Total tabel gagal/skip FK     : ${totalFailed}`);

  // Tampilkan audit akhir
  console.log(`\n🔍 AUDIT AKHIR - Tabel dengan data di PRODUKSI vs DEMO:`);
  for (const tableName of tables) {
    const prodCount = await countRows(tableName, PROD_ID);
    const demoCount = await countRows(tableName, DEMO_ID);
    if (prodCount > 0 || demoCount > 0) {
      const status = prodCount > 0 && demoCount === 0 ? '❌ KOSONG DI DEMO' :
                     prodCount > 0 && demoCount > 0 ? '✅' : '🆕 HANYA DI DEMO';
      console.log(`   ${status} | ${tableName.padEnd(40)} | prod:${prodCount} | demo:${demoCount}`);
    }
  }

  console.log(`\n🎉 CLONE SELESAI!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
