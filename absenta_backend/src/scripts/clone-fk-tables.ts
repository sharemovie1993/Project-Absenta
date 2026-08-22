/**
 * Clone tabel-tabel yang gagal karena FK conflict
 * Dengan remapping FK dari produksi ke demo
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

// Build global FK map dari semua entitas yang sudah ada di demo
async function buildIdMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const pairs: {table: string, matchKey: string}[] = [
    {table: 'User', matchKey: 'email'},
    {table: 'Guru', matchKey: 'nip'},
    {table: 'Siswa', matchKey: 'nis'},
    {table: 'Kelas', matchKey: 'nama_kelas'},
    {table: 'Jurusan', matchKey: 'kode'},
    {table: 'TahunPelajaran', matchKey: 'tahun'},
    {table: 'Semester', matchKey: 'nama_semester'},
    {table: 'OrganizationalPosition', matchKey: 'code'},
    {table: 'Mapel', matchKey: 'kode_mapel'},
    {table: 'JenisPelanggaran', matchKey: 'nama'},
    {table: 'JenisPrestasi', matchKey: 'nama'},
    {table: 'ProgramKeahlian', matchKey: 'kode'},
    {table: 'SarprasCategory', matchKey: 'nama'},
    {table: 'SarprasLocation', matchKey: 'nama'},
  ];

  for (const {table, matchKey} of pairs) {
    try {
      const prodRows = await prisma.$queryRawUnsafe<{id: string, [key: string]: any}[]>(
        `SELECT id, "${matchKey}" FROM "${table}" WHERE tenant_id = $1`, PROD_ID
      );
      const demoRows = await prisma.$queryRawUnsafe<{id: string, [key: string]: any}[]>(
        `SELECT id, "${matchKey}" FROM "${table}" WHERE tenant_id = $1`, DEMO_ID
      );

      for (const prod of prodRows) {
        const demo = demoRows.find(d => d[matchKey] === prod[matchKey]);
        if (demo) map.set(prod.id, demo.id);
      }
    } catch (_) {
      // skip if column doesn't exist
    }
  }

  // Juga map Semester by nama_semester + tahun (komposit)
  try {
    const semProd = await prisma.$queryRawUnsafe<{id: string, nama_semester: string, tahun_pelajaran_id: string}[]>(
      `SELECT id, nama_semester, tahun_pelajaran_id FROM "Semester" WHERE tenant_id = $1`, PROD_ID
    );
    const semDemo = await prisma.$queryRawUnsafe<{id: string, nama_semester: string, tahun_pelajaran_id: string}[]>(
      `SELECT id, nama_semester, tahun_pelajaran_id FROM "Semester" WHERE tenant_id = $1`, DEMO_ID
    );
    for (const s of semProd) {
      const newTpId = map.get(s.tahun_pelajaran_id);
      const match = semDemo.find(d => d.nama_semester === s.nama_semester && d.tahun_pelajaran_id === newTpId);
      if (match) map.set(s.id, match.id);
    }
  } catch (_) {}

  // Map Guru by nama_guru juga (fallback)
  try {
    const guruProd = await prisma.$queryRawUnsafe<{id: string, nama_guru: string}[]>(
      `SELECT id, nama_guru FROM "Guru" WHERE tenant_id = $1`, PROD_ID
    );
    const guruDemo = await prisma.$queryRawUnsafe<{id: string, nama_guru: string}[]>(
      `SELECT id, nama_guru FROM "Guru" WHERE tenant_id = $1`, DEMO_ID
    );
    for (const g of guruProd) {
      if (!map.has(g.id)) {
        const match = guruDemo.find(d => d.nama_guru === g.nama_guru);
        if (match) map.set(g.id, match.id);
      }
    }
  } catch (_) {}

  console.log(`   ✅ ID Map dibangun: ${map.size} entri`);
  return map;
}

function remapRow(row: Record<string, any>, idMap: Map<string, string>): Record<string, any> {
  const newRow: Record<string, any> = {};
  for (const [col, val] of Object.entries(row)) {
    if (col === 'id') {
      newRow[col] = randomUUID();
    } else if (col === 'tenant_id') {
      newRow[col] = DEMO_ID;
    } else if (typeof val === 'string' && idMap.has(val)) {
      newRow[col] = idMap.get(val)!;
    } else {
      newRow[col] = val;
    }
  }
  return newRow;
}

async function cloneWithRemap(tableName: string, idMap: Map<string, string>): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "${tableName}" WHERE tenant_id = $1`, PROD_ID
  );
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  let inserted = 0;

  for (const row of rows) {
    const newRow = remapRow(row, idMap);
    const cols = columns.map(c => `"${c}"`).join(', ');
    const vals = columns.map(c => newRow[c]);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        ...vals
      );
      inserted++;
    } catch (_) {}
  }

  return inserted;
}

async function main() {
  console.log(`🔧 Clone tabel-tabel FK-dependent ke Demo\n`);

  console.log(`🗂️  Membangun ID Map...`);
  const idMap = await buildIdMap();

  const targets = [
    'JenisKegiatanMaster',
    'KelasMapel',
    'JadwalKontrakKbm', // sudah ada tapi cek ulang
    'JadwalKBM',
    'JadwalPiketGuru',
    'SesiAbsensi',
    'SesiGerbang',
    'AbsenSiswa',
    'AbsenGuru',
    'AbsenGerbangSiswa',
    'SiswaAkademik',
    'NilaiSiswa',
    'RaporSiswa',
    'KonselingSiswa',
    'PelanggaranSiswa',
    'PrestasiSiswa',
    'JadwalKegiatan',
    'PerangkatAjar',
    'GuruTimeOff',
    'SupervisiGuru',
    'P5Projek',
    'Kkmp',
    'SarprasAsset',
    'SarprasLoan',
    'SuratMasuk',
    'SuratKeluar',
    'SystemConfig',
    'ProgresMateri',
    'NotificationLog',
  ];

  let totalInserted = 0;
  for (const tableName of targets) {
    try {
      const demoCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
        `SELECT COUNT(*) as count FROM "${tableName}" WHERE tenant_id = $1`, DEMO_ID
      );
      const exists = Number(demoCount[0].count);
      if (exists > 0) {
        console.log(`   ⏭️  Skip (${exists} sudah ada) | ${tableName}`);
        continue;
      }

      const n = await cloneWithRemap(tableName, idMap);
      if (n > 0) {
        console.log(`   ✅ ${String(n).padStart(5)} baris | ${tableName}`);
        totalInserted += n;
      } else {
        const prodCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
          `SELECT COUNT(*) as count FROM "${tableName}" WHERE tenant_id = $1`, PROD_ID
        );
        const prodN = Number(prodCount[0].count);
        if (prodN > 0) {
          console.log(`   ⚠️  ${String(0).padStart(5)} baris | ${tableName} (${prodN} di produksi - masih ada FK issue)`);
        } else {
          console.log(`   ⚪  ${String(0).padStart(5)} baris | ${tableName} (kosong di produksi)`);
        }
      }
    } catch (e: any) {
      console.log(`   ❌ Error | ${tableName}: ${e.message?.slice(0, 100)}`);
    }
  }

  // Flush cache hint
  console.log(`\n✅ Total baris diklone : ${totalInserted}`);
  console.log(`\n🔍 Audit akhir tabel penting:`);
  
  const checks = ['JadwalKBM', 'SesiAbsensi', 'AbsenSiswa', 'AbsenGuru', 'JenisKegiatanMaster', 'KelasMapel'];
  for (const t of checks) {
    try {
      const prod = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT COUNT(*) as count FROM "${t}" WHERE tenant_id = $1`, PROD_ID);
      const demo = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT COUNT(*) as count FROM "${t}" WHERE tenant_id = $1`, DEMO_ID);
      const pn = Number(prod[0].count), dn = Number(demo[0].count);
      console.log(`   ${dn > 0 ? '✅' : '❌'} ${t.padEnd(30)} prod:${pn} demo:${dn}`);
    } catch (_) {}
  }

  console.log(`\n🎉 SELESAI!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
