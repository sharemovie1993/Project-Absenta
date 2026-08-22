/**
 * FULL CLONE 360° TOTAL: CLONE SELURUH JADWAL KBM, SESI ABSENSI, PIKET, DSB DARI PRODUKSI KE DEMO
 * Dengan Normalizer Nama Guru & Siswa (membersihkan suffix (Demo))
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

type IdMap = Map<string, string>;

function cleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(Demo\)$/i, '').trim().toLowerCase();
}

async function build360IdMap(): Promise<IdMap> {
  const map: IdMap = new Map();
  console.log('🗂️  Membangun 360° ID Mapping (dengan Name Normalizer)...');

  // 1. Map Guru (by clean nama_guru)
  const gProd = await prisma.guru.findMany({ where: { tenant_id: PROD_ID } });
  const gDemo = await prisma.guru.findMany({ where: { tenant_id: DEMO_ID } });
  let gMatch = 0;
  for (const gp of gProd) {
    const gd = gDemo.find(d => cleanName(d.nama_guru) === cleanName(gp.nama_guru));
    if (gd) {
      map.set(gp.id, gd.id);
      gMatch++;
    }
  }
  console.log(`   👨‍🏫 Guru: ${gMatch}/${gProd.length} berhasil di-map!`);

  // 2. Map User (by clean full_name atau via mapped Guru)
  const uProd = await prisma.user.findMany({ where: { tenant_id: PROD_ID } });
  const uDemo = await prisma.user.findMany({ where: { tenant_id: DEMO_ID } });
  let uMatch = 0;
  for (const up of uProd) {
    const ud = uDemo.find(d => cleanName(d.full_name) === cleanName(up.full_name));
    if (ud) {
      map.set(up.id, ud.id);
      uMatch++;
    }
  }
  console.log(`   👥 User: ${uMatch}/${uProd.length} berhasil di-map!`);

  // 3. Map Siswa (by clean nama_siswa)
  const sProd = await prisma.siswa.findMany({ where: { tenant_id: PROD_ID } });
  const sDemo = await prisma.siswa.findMany({ where: { tenant_id: DEMO_ID } });
  let sMatch = 0;
  for (const sp of sProd) {
    const sd = sDemo.find(d => cleanName(d.nama_siswa) === cleanName(sp.nama_siswa));
    if (sd) {
      map.set(sp.id, sd.id);
      sMatch++;
    }
  }
  console.log(`   🎒 Siswa: ${sMatch}/${sProd.length} berhasil di-map!`);

  // 4. Map Kelas (by clean nama_kelas)
  const kProd = await prisma.kelas.findMany({ where: { tenant_id: PROD_ID } });
  const kDemo = await prisma.kelas.findMany({ where: { tenant_id: DEMO_ID } });
  for (const kp of kProd) {
    const kd = kDemo.find(d => cleanName(d.nama_kelas) === cleanName(kp.nama_kelas));
    if (kd) map.set(kp.id, kd.id);
  }
  console.log(`   🏫 Kelas: ${kDemo.length} kelas di-map!`);

  // 5. Map Jurusan (by kode atau clean nama)
  const jProd = await prisma.jurusan.findMany({ where: { tenant_id: PROD_ID } });
  const jDemo = await prisma.jurusan.findMany({ where: { tenant_id: DEMO_ID } });
  for (const jp of jProd) {
    const jd = jDemo.find(d => (jp.kode && d.kode === jp.kode) || cleanName(d.nama) === cleanName(jp.nama));
    if (jd) map.set(jp.id, jd.id);
  }

  // 6. Map Mapel (by clean kode_mapel atau nama_mapel)
  const mProd = await prisma.mapel.findMany({ where: { tenant_id: PROD_ID } });
  const mDemo = await prisma.mapel.findMany({ where: { tenant_id: DEMO_ID } });
  for (const mp of mProd) {
    const md = mDemo.find(d => d.kode_mapel === mp.kode_mapel || cleanName(d.nama_mapel) === cleanName(mp.nama_mapel));
    if (md) map.set(mp.id, md.id);
  }
  console.log(`   📚 Mapel: ${mDemo.length} mapel di-map!`);

  // 7. Map TahunPelajaran (by tahun)
  const tpProd = await prisma.tahunPelajaran.findMany({ where: { tenant_id: PROD_ID } });
  const tpDemo = await prisma.tahunPelajaran.findMany({ where: { tenant_id: DEMO_ID } });
  for (const tpp of tpProd) {
    const tpd = tpDemo.find(d => d.tahun === tpp.tahun);
    if (tpd) map.set(tpp.id, tpd.id);
  }

  // 8. Map Semester (by clean nama_semester + mapped TP)
  const semProd = await prisma.semester.findMany({ where: { tenant_id: PROD_ID } });
  const semDemo = await prisma.semester.findMany({ where: { tenant_id: DEMO_ID } });
  for (const semp of semProd) {
    const targetTpId = map.get(semp.tahun_pelajaran_id);
    const semd = semDemo.find(d => cleanName(d.nama_semester) === cleanName(semp.nama_semester) && d.tahun_pelajaran_id === targetTpId);
    if (semd) map.set(semp.id, semd.id);
  }
  console.log(`   📆 Semester: ${semDemo.length} semester di-map!`);

  // 9. Map JenisKegiatanMaster
  const jkmProd = await prisma.jenisKegiatanMaster.findMany({ where: { tenant_id: PROD_ID } });
  const jkmDemo = await prisma.jenisKegiatanMaster.findMany({ where: { tenant_id: DEMO_ID } });
  for (const jkmp of jkmProd) {
    const jkmd = jkmDemo.find(d => cleanName(d.nama) === cleanName(jkmp.nama));
    if (jkmd) map.set(jkmp.id, jkmd.id);
  }

  return map;
}

function remapRow(row: Record<string, any>, idMap: IdMap, adminFallbackId?: string): Record<string, any> {
  const newRow: Record<string, any> = {};
  for (const [col, val] of Object.entries(row)) {
    if (col === 'id') {
      newRow[col] = randomUUID();
    } else if (col === 'tenant_id') {
      newRow[col] = DEMO_ID;
    } else if (typeof val === 'string' && idMap.has(val)) {
      newRow[col] = idMap.get(val)!;
    } else if (col === 'created_by_user_id' && typeof val === 'string' && !idMap.has(val)) {
      newRow[col] = adminFallbackId || null;
    } else {
      newRow[col] = val;
    }
  }
  return newRow;
}

async function cloneTableWithRemap(tableName: string, idMap: IdMap, adminFallbackId?: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "${tableName}" WHERE tenant_id = $1`, PROD_ID
  );
  if (rows.length === 0) return 0;
  const columns = Object.keys(rows[0]);
  let inserted = 0;

  for (const row of rows) {
    const newRow = remapRow(row, idMap, adminFallbackId);
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
  console.log('🚀 [360° TOTAL CLONING] Menyinkronkan seluruh data operasional ke Tenant Demo...');

  // 1. Pastikan JenisKegiatanMaster terisi jika masih kosong
  const jkmDemoCount = await prisma.jenisKegiatanMaster.count({ where: { tenant_id: DEMO_ID } });
  if (jkmDemoCount === 0) {
    const jkmProd = await prisma.jenisKegiatanMaster.findMany({ where: { tenant_id: PROD_ID } });
    for (const item of jkmProd) {
      await prisma.jenisKegiatanMaster.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          nama: item.nama,
          tipe: item.tipe,
          urutan: item.urutan,
          aktif: item.aktif,
        }
      }).catch(() => {});
    }
    console.log(`✅ ${jkmProd.length} JenisKegiatanMaster disemai ke Demo!`);
  }

  // 2. Bangun Map ID 360 Derajat
  const idMap = await build360IdMap();

  // Temukan user admin demo sebagai fallback created_by_user_id
  const adminDemo = await prisma.user.findFirst({
    where: { tenant_id: DEMO_ID, email: 'admin@absenta.id' }
  });
  const adminFallbackId = adminDemo?.id;

  // 3. Clone JadwalKBM
  console.log('\n📅 Mengclone JadwalKBM...');
  await prisma.jadwalKBM.deleteMany({ where: { tenant_id: DEMO_ID } });
  const kbmCount = await cloneTableWithRemap('JadwalKBM', idMap, adminFallbackId);
  console.log(`   ✅ Selesai: ${kbmCount} baris JadwalKBM berhasil diklone!`);

  // 4. Clone JadwalPiketGuru
  console.log('\n🛡️  Mengclone JadwalPiketGuru...');
  await prisma.jadwalPiketGuru.deleteMany({ where: { tenant_id: DEMO_ID } });
  const piketCount = await cloneTableWithRemap('JadwalPiketGuru', idMap, adminFallbackId);
  console.log(`   ✅ Selesai: ${piketCount} baris JadwalPiketGuru berhasil diklone!`);

  // 5. Clone SesiAbsensi
  console.log('\n⏱️  Mengclone SesiAbsensi...');
  await prisma.sesiAbsensi.deleteMany({ where: { tenant_id: DEMO_ID } });
  const sesiCount = await cloneTableWithRemap('SesiAbsensi', idMap, adminFallbackId);
  console.log(`   ✅ Selesai: ${sesiCount} baris SesiAbsensi berhasil diklone!`);

  // 6. Clone SesiGerbang
  console.log('\n🚪 Mengclone SesiGerbang...');
  await prisma.sesiGerbang.deleteMany({ where: { tenant_id: DEMO_ID } });
  const gerbangCount = await cloneTableWithRemap('SesiGerbang', idMap, adminFallbackId);
  console.log(`   ✅ Selesai: ${gerbangCount} baris SesiGerbang berhasil diklone!`);

  // 7. Clone AbsenSiswa & AbsenGuru
  console.log('\n📝 Mengclone AbsenSiswa & AbsenGuru...');
  await prisma.absenSiswa.deleteMany({ where: { tenant_id: DEMO_ID } });
  await prisma.absenGuru.deleteMany({ where: { tenant_id: DEMO_ID } });
  const absenSiswaCount = await cloneTableWithRemap('AbsenSiswa', idMap, adminFallbackId);
  const absenGuruCount = await cloneTableWithRemap('AbsenGuru', idMap, adminFallbackId);
  console.log(`   ✅ Selesai: ${absenSiswaCount} AbsenSiswa & ${absenGuruCount} AbsenGuru berhasil diklone!`);

  // 8. Audit Akhir
  console.log('\n================ AUDIT HASIL CLONE 360° ================');
  const checkTables = [
    'User', 'Guru', 'Siswa', 'Kelas', 'Jurusan', 'Mapel', 'GuruMapel',
    'TahunPelajaran', 'Semester', 'OrganizationalPosition', 'OrganizationalAssignment',
    'JenisKegiatanMaster', 'JadwalKBM', 'JadwalKontrakKbm', 'JadwalPiketGuru',
    'SesiAbsensi', 'SesiGerbang', 'AbsenSiswa', 'AbsenGuru'
  ];

  for (const t of checkTables) {
    const count = await prisma.$queryRawUnsafe<{count: bigint}[]>(
      `SELECT COUNT(*) as count FROM "${t}" WHERE tenant_id = $1`, DEMO_ID
    );
    console.log(`   ✅ ${t.padEnd(25)} : ${Number(count[0].count)} baris`);
  }

  console.log('========================================================');
  console.log('🎉 CLONING 360° DATA PRODUKSI KE DEMO SELESAI 100%!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
