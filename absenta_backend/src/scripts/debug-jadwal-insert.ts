import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

function cleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(Demo\)$/i, '').trim().toLowerCase();
}

async function debugJadwalInsert() {
  const gProd = await prisma.guru.findMany({ where: { tenant_id: PROD_ID } });
  const gDemo = await prisma.guru.findMany({ where: { tenant_id: DEMO_ID } });
  const guruMap = new Map<string, string>();
  gProd.forEach(gp => {
    const gd = gDemo.find(d => cleanName(d.nama_guru) === cleanName(gp.nama_guru));
    if (gd) guruMap.set(gp.id, gd.id);
  });

  const kProd = await prisma.kelas.findMany({ where: { tenant_id: PROD_ID } });
  const kDemo = await prisma.kelas.findMany({ where: { tenant_id: DEMO_ID } });
  const kelasMap = new Map<string, string>();
  kProd.forEach(kp => {
    const kd = kDemo.find(d => cleanName(d.nama_kelas) === cleanName(kp.nama_kelas));
    if (kd) kelasMap.set(kp.id, kd.id);
  });

  const mProd = await prisma.mapel.findMany({ where: { tenant_id: PROD_ID } });
  const mDemo = await prisma.mapel.findMany({ where: { tenant_id: DEMO_ID } });
  const mapelMap = new Map<string, string>();
  mProd.forEach(mp => {
    const md = mDemo.find(d => d.kode_mapel === mp.kode_mapel || cleanName(d.nama_mapel) === cleanName(mp.nama_mapel));
    if (md) mapelMap.set(mp.id, md.id);
  });

  const tpProd = await prisma.tahunPelajaran.findMany({ where: { tenant_id: PROD_ID } });
  const tpDemo = await prisma.tahunPelajaran.findMany({ where: { tenant_id: DEMO_ID } });
  const tpMap = new Map<string, string>();
  tpProd.forEach(tpp => {
    const tpd = tpDemo.find(d => d.tahun === tpp.tahun);
    if (tpd) tpMap.set(tpp.id, tpd.id);
  });

  const semProd = await prisma.semester.findMany({ where: { tenant_id: PROD_ID } });
  const semDemo = await prisma.semester.findMany({ where: { tenant_id: DEMO_ID } });
  const semMap = new Map<string, string>();
  semProd.forEach(semp => {
    const targetTpId = tpMap.get(semp.tahun_pelajaran_id);
    const semd = semDemo.find(d => cleanName(d.nama_semester) === cleanName(semp.nama_semester) && d.tahun_pelajaran_id === targetTpId);
    if (semd) semMap.set(semp.id, semd.id);
  });

  const adminDemo = await prisma.user.findFirst({ where: { tenant_id: DEMO_ID, email: 'admin@absenta.id' } });

  const rows = await prisma.jadwalKBM.findMany({ where: { tenant_id: PROD_ID }, take: 10 });
  console.log(`Mencoba insert ${rows.length} baris JadwalKBM...`);

  for (const r of rows) {
    const newGuruId = r.guru_id ? guruMap.get(r.guru_id) : null;
    const newKelasId = r.kelas_id ? kelasMap.get(r.kelas_id) : null;
    const newMapelId = r.mapel_id ? mapelMap.get(r.mapel_id) : null;
    const newTpId = r.tahun_pelajaran_id ? tpMap.get(r.tahun_pelajaran_id) : null;
    const newSemId = r.semester_id ? semMap.get(r.semester_id) : null;

    console.log('Mapping check:', {
      guru: !!newGuruId,
      kelas: !!newKelasId,
      mapel: !!newMapelId,
      tp: !!newTpId,
      sem: !!newSemId
    });

    if (!newKelasId || !newTpId || !newSemId || !newGuruId) {
      console.log('Skip row due to missing required FK');
      continue;
    }

    try {
      const created = await prisma.jadwalKBM.create({
        data: {
          id: randomUUID(),
          tenant_id: DEMO_ID,
          tahun_pelajaran_id: newTpId,
          semester_id: newSemId,
          kelas_id: newKelasId,
          hari: r.hari,
          slot_index: r.slot_index,
          jam_mulai: r.jam_mulai,
          jam_selesai: r.jam_selesai,
          mapel_id: newMapelId,
          guru_id: newGuruId,
          jenis_kegiatan: r.jenis_kegiatan,
          asc_id: r.asc_id ? `${r.asc_id}-demo` : null,
          created_by_user_id: adminDemo?.id || null,
        }
      });
      console.log('✅ Berhasil create JadwalKBM:', created.id);
    } catch (err: any) {
      console.error('❌ Gagal create JadwalKBM:', err.message);
    }
  }
}

debugJadwalInsert().catch(console.error).finally(() => prisma.$disconnect());
