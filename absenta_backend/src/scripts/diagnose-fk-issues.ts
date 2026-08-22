import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function diagnose() {
  // Cek satu baris JadwalKBM dari produksi
  const sample = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "JadwalKBM" WHERE tenant_id = $1 LIMIT 3`, PROD_ID
  );
  console.log('=== SAMPLE JadwalKBM (3 baris) ===');
  sample.forEach((r, i) => console.log(`Row ${i+1}:`, JSON.stringify(r, null, 2)));

  // Cek kolom FK di JadwalKBM
  const cols = await prisma.$queryRaw<{column_name: string}[]>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'JadwalKBM' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  console.log('\n=== KOLOM JadwalKBM ===');
  console.log(cols.map(c => c.column_name).join(', '));

  // Cek apakah guru_mapel_id ada di demo
  if (sample.length > 0 && sample[0].guru_mapel_id) {
    const gmId = sample[0].guru_mapel_id;
    const gmProd = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "GuruMapel" WHERE id = $1`, gmId);
    console.log(`\n=== GuruMapel id=${gmId} ===`);
    console.log(JSON.stringify(gmProd[0], null, 2));
    
    // Cek apakah GuruMapel ini ada di demo
    if (gmProd[0]) {
      const gmDemo = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "GuruMapel" WHERE tenant_id = $1 AND guru_id = $2 AND mapel_id = $3 LIMIT 1`,
        DEMO_ID, gmProd[0].guru_id, gmProd[0].mapel_id
      );
      console.log(`GuruMapel di demo: ${JSON.stringify(gmDemo[0] || 'TIDAK ADA')}`);
    }
  }

  // Cek SesiAbsensi sample
  const sesiSample = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "SesiAbsensi" WHERE tenant_id = $1 LIMIT 2`, PROD_ID
  );
  console.log('\n=== SAMPLE SesiAbsensi ===');
  sesiSample.forEach((r, i) => console.log(`Row ${i+1}:`, JSON.stringify(r)));

  // Cek JenisKegiatanMaster sample
  const jenisKeg = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "JenisKegiatanMaster" WHERE tenant_id = $1 LIMIT 3`, PROD_ID
  );
  console.log('\n=== SAMPLE JenisKegiatanMaster ===');
  console.log(JSON.stringify(jenisKeg, null, 2));
  
  // Cek kolom JenisKegiatanMaster
  const jenisKols = await prisma.$queryRaw<{column_name: string}[]>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'JenisKegiatanMaster' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  console.log('\nKolom JenisKegiatanMaster:', jenisKols.map(c => c.column_name).join(', '));

  // Cek GuruMapel di demo vs produksi
  const gmProdCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT COUNT(*) as count FROM "GuruMapel" WHERE tenant_id = $1`, PROD_ID);
  const gmDemoCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT COUNT(*) as count FROM "GuruMapel" WHERE tenant_id = $1`, DEMO_ID);
  console.log(`\nGuruMapel: prod=${Number(gmProdCount[0].count)}, demo=${Number(gmDemoCount[0].count)}`);
}

diagnose().catch(console.error).finally(() => prisma.$disconnect());
