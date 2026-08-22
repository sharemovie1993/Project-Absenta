/**
 * Clone tabel JadwalKBM, SesiAbsensi, JenisKegiatanMaster, JadwalPiketGuru
 * dengan remapping FK yang lengkap dan benar
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

type IdMap = Map<string, string>;

async function buildComprehensiveIdMap(): Promise<IdMap> {
  const map: IdMap = new Map();

  // Helper: map by single key
  async function mapByKey(table: string, key: string) {
    try {
      const prod = await prisma.$queryRawUnsafe<{id: string}[]>(
        `SELECT id, "${key}" FROM "${table}" WHERE tenant_id = $1`, PROD_ID
      );
      const demo = await prisma.$queryRawUnsafe<{id: string}[]>(
        `SELECT id, "${key}" FROM "${table}" WHERE tenant_id = $1`, DEMO_ID
      );
      let mapped = 0;
      for (const p of prod as any[]) {
        const d = (demo as any[]).find(x => x[key] === p[key]);
        if (d) { map.set(p.id, d.id); mapped++; }
      }
      console.log(`   ${table} (by ${key}): ${mapped}/${prod.length} mapped`);
    } catch (e: any) {
      console.log(`   ⚠️ ${table}: ${e.message?.slice(0, 60)}`);
    }
  }

  // User by email
  try {
    const prod = await prisma.$queryRawUnsafe<{id: string, email: string}[]>(
      `SELECT id, email FROM "User" WHERE tenant_id = $1`, PROD_ID
    );
    const demo = await prisma.$queryRawUnsafe<{id: string, email: string}[]>(
      `SELECT id, email FROM "User" WHERE tenant_id = $1`, DEMO_ID
    );
    for (const p of prod) {
      const d = demo.find(x => x.email === p.email);
      if (d) map.set(p.id, d.id);
    }
    console.log(`   User (by email): ${map.size} mapped`);
  } catch (_) {}

  await mapByKey('Guru', 'nip');
  // Guru fallback by nama_guru
  try {
    const prod = await prisma.$queryRawUnsafe<{id: string, nama_guru: string}[]>(
      `SELECT id, nama_guru FROM "Guru" WHERE tenant_id = $1`, PROD_ID
    );
    const demo = await prisma.$queryRawUnsafe<{id: string, nama_guru: string}[]>(
      `SELECT id, nama_guru FROM "Guru" WHERE tenant_id = $1`, DEMO_ID
    );
    for (const p of prod) {
      if (!map.has(p.id)) {
        const d = demo.find(x => x.nama_guru === p.nama_guru);
        if (d) map.set(p.id, d.id);
      }
    }
  } catch (_) {}

  await mapByKey('Siswa', 'nis');
  await mapByKey('Kelas', 'nama_kelas');
  await mapByKey('Jurusan', 'kode');
  await mapByKey('Mapel', 'kode_mapel');
  await mapByKey('TahunPelajaran', 'tahun');
  await mapByKey('OrganizationalPosition', 'code');

  // Semester: composite by nama_semester + tp
  try {
    const semProd = await prisma.$queryRawUnsafe<{id: string, nama_semester: string, tahun_pelajaran_id: string}[]>(
      `SELECT id, nama_semester, tahun_pelajaran_id FROM "Semester" WHERE tenant_id = $1`, PROD_ID
    );
    const semDemo = await prisma.$queryRawUnsafe<{id: string, nama_semester: string, tahun_pelajaran_id: string}[]>(
      `SELECT id, nama_semester, tahun_pelajaran_id FROM "Semester" WHERE tenant_id = $1`, DEMO_ID
    );
    for (const s of semProd) {
      const newTpId = map.get(s.tahun_pelajaran_id);
      const d = semDemo.find(x => x.nama_semester === s.nama_semester && x.tahun_pelajaran_id === newTpId);
      if (d) map.set(s.id, d.id);
    }
    console.log(`   Semester: mapped`);
  } catch (_) {}

  // GuruMapel: by guru_id + mapel_id (setelah guru dan mapel di-map)
  try {
    const gmProd = await prisma.$queryRawUnsafe<{id: string, guru_id: string, mapel_id: string, kelas_id: string}[]>(
      `SELECT id, guru_id, mapel_id, kelas_id FROM "GuruMapel" WHERE tenant_id = $1`, PROD_ID
    );
    const gmDemo = await prisma.$queryRawUnsafe<{id: string, guru_id: string, mapel_id: string, kelas_id: string}[]>(
      `SELECT id, guru_id, mapel_id, kelas_id FROM "GuruMapel" WHERE tenant_id = $1`, DEMO_ID
    );
    let gmMapped = 0;
    for (const gm of gmProd) {
      const newGuruId = map.get(gm.guru_id);
      const newMapelId = map.get(gm.mapel_id);
      const newKelasId = gm.kelas_id ? map.get(gm.kelas_id) : undefined;
      if (!newGuruId || !newMapelId) continue;
      const d = gmDemo.find(x =>
        x.guru_id === newGuruId &&
        x.mapel_id === newMapelId &&
        (newKelasId ? x.kelas_id === newKelasId : true)
      );
      if (d) { map.set(gm.id, d.id); gmMapped++; }
    }
    console.log(`   GuruMapel: ${gmMapped} mapped`);
  } catch (e: any) {
    console.log(`   ⚠️ GuruMapel: ${e.message?.slice(0, 60)}`);
  }

  console.log(`\n✅ Total ID map: ${map.size} entri\n`);
  return map;
}

function remapRow(row: Record<string, any>, idMap: IdMap): Record<string, any> {
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

async function cloneTableWithRemap(tableName: string, idMap: IdMap): Promise<number> {
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
  console.log(`🔧 Clone tabel FK-dependent dengan remap lengkap\n`);
  console.log(`🗂️  Membangun ID Map...`);
  const idMap = await buildComprehensiveIdMap();

  // 1. JenisKegiatanMaster: tidak ada FK, harus clone langsung dengan ignore conflict
  console.log(`\n📋 Mengclone JenisKegiatanMaster...`);
  const jkmCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "JenisKegiatanMaster" WHERE tenant_id = $1`, DEMO_ID
  );
  if (Number(jkmCount[0].count) === 0) {
    const jkm = await cloneTableWithRemap('JenisKegiatanMaster', idMap);
    console.log(`   ✅ ${jkm} baris JenisKegiatanMaster`);
  } else {
    console.log(`   ⏭️ Skip (sudah ada ${Number(jkmCount[0].count)} baris)`);
  }

  // Build JenisKegiatanMaster ID map by nama
  await (async () => {
    try {
      const prod = await prisma.$queryRawUnsafe<{id: string, nama: string}[]>(
        `SELECT id, nama FROM "JenisKegiatanMaster" WHERE tenant_id = $1`, PROD_ID
      );
      const demo = await prisma.$queryRawUnsafe<{id: string, nama: string}[]>(
        `SELECT id, nama FROM "JenisKegiatanMaster" WHERE tenant_id = $1`, DEMO_ID
      );
      for (const p of prod) {
        const d = demo.find(x => x.nama === p.nama);
        if (d) idMap.set(p.id, d.id);
      }
      console.log(`   ✅ JenisKegiatanMaster: ${prod.length} entri di-map`);
    } catch (_) {}
  })();

  // 2. JadwalKBM
  console.log(`\n📋 Mengclone JadwalKBM (2605 baris)...`);
  const jadwalCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "JadwalKBM" WHERE tenant_id = $1`, DEMO_ID
  );
  if (Number(jadwalCount[0].count) === 0) {
    const n = await cloneTableWithRemap('JadwalKBM', idMap);
    console.log(`   ✅ ${n}/2605 baris JadwalKBM`);
  } else {
    console.log(`   ⏭️ Skip (sudah ada ${Number(jadwalCount[0].count)} baris)`);
  }

  // 3. SesiAbsensi
  console.log(`\n📋 Mengclone SesiAbsensi (239 baris)...`);
  const sesiCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "SesiAbsensi" WHERE tenant_id = $1`, DEMO_ID
  );
  if (Number(sesiCount[0].count) === 0) {
    const n = await cloneTableWithRemap('SesiAbsensi', idMap);
    console.log(`   ✅ ${n}/239 baris SesiAbsensi`);
  } else {
    console.log(`   ⏭️ Skip (sudah ada ${Number(sesiCount[0].count)} baris)`);
  }

  // 4. SesiGerbang
  console.log(`\n📋 Mengclone SesiGerbang (11 baris)...`);
  const sesiGerbangCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "SesiGerbang" WHERE tenant_id = $1`, DEMO_ID
  );
  if (Number(sesiGerbangCount[0].count) === 0) {
    const n = await cloneTableWithRemap('SesiGerbang', idMap);
    console.log(`   ✅ ${n}/11 baris SesiGerbang`);
  } else {
    console.log(`   ⏭️ Skip`);
  }

  // 5. JadwalPiketGuru  
  console.log(`\n📋 Mengclone JadwalPiketGuru (58 baris)...`);
  const piketCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(
    `SELECT COUNT(*) as count FROM "JadwalPiketGuru" WHERE tenant_id = $1`, DEMO_ID
  );
  if (Number(piketCount[0].count) === 0) {
    const n = await cloneTableWithRemap('JadwalPiketGuru', idMap);
    console.log(`   ✅ ${n}/58 baris JadwalPiketGuru`);
  } else {
    console.log(`   ⏭️ Skip`);
  }

  // Audit final
  console.log(`\n🔍 Audit Akhir:`);
  const checks = ['JadwalKBM', 'SesiAbsensi', 'SesiGerbang', 'JadwalPiketGuru', 'JenisKegiatanMaster', 'AbsenSiswa', 'AbsenGuru', 'Mapel', 'GuruMapel', 'JadwalKontrakKbm'];
  for (const t of checks) {
    try {
      const p = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT COUNT(*) as count FROM "${t}" WHERE tenant_id = $1`, PROD_ID);
      const d = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT COUNT(*) as count FROM "${t}" WHERE tenant_id = $1`, DEMO_ID);
      const pn = Number(p[0].count), dn = Number(d[0].count);
      console.log(`   ${dn >= pn ? '✅' : dn > 0 ? '🟡' : '❌'} ${t.padEnd(30)} prod:${pn} demo:${dn}`);
    } catch (_) {}
  }

  console.log(`\n🎉 SELESAI!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
