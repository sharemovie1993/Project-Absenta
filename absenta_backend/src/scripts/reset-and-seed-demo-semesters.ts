/**
 * Reset dan seed ulang Semester tenant demo
 * dengan format nama yang sama seperti tenant produksi: "Ganjil" dan "Genap"
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';
const PROD_TENANT_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';

async function resetAndSeedSemesters() {
  console.log(`🔄 Reset & Seed Semester Tenant Demo...`);

  // 1. Hapus semester lama yang salah nama
  const deleted = await prisma.semester.deleteMany({ where: { tenant_id: DEMO_TENANT_ID } });
  console.log(`🗑️  Hapus ${deleted.count} semester lama di tenant demo`);

  // 2. Ambil TahunPelajaran demo (sudah ada 4)
  const tpDemo = await prisma.tahunPelajaran.findMany({
    where: { tenant_id: DEMO_TENANT_ID },
    orderBy: { tahun: 'asc' }
  });
  console.log(`\n📅 TahunPelajaran Demo (${tpDemo.length}):`);
  tpDemo.forEach(tp => console.log(`   ${tp.is_active ? '🟢' : '⚪'} ${tp.tahun} (${tp.id})`));

  // 3. Ambil semester dari tenant produksi sebagai referensi
  const semProd = await prisma.semester.findMany({
    where: { tenant_id: PROD_TENANT_ID },
    include: { TahunPelajaran: true },
    orderBy: { created_at: 'asc' }
  });
  console.log(`\n📆 Referensi semester dari produksi (${semProd.length}):`);
  semProd.forEach(s => console.log(`   ${s.is_active ? '🟢 AKTIF' : '⚪      '} "${s.nama_semester}" | TP: "${s.TahunPelajaran.tahun}"`));

  // 4. Buat mapping tahun -> TahunPelajaran demo
  const tpDemoByTahun: Record<string, typeof tpDemo[0]> = {};
  for (const tp of tpDemo) {
    tpDemoByTahun[tp.tahun] = tp;
  }

  // 5. Buat semester demo dengan nama yang sama persis seperti produksi
  console.log(`\n🌱 Membuat semester baru...`);
  let created = 0;

  // Tentukan semester aktif produksi
  const activeSemProd = semProd.find(s => s.is_active);
  const activeTahun = activeSemProd?.TahunPelajaran?.tahun;
  const activeNama = activeSemProd?.nama_semester;
  
  // Buat semester untuk setiap TahunPelajaran demo
  for (const tp of tpDemo) {
    for (const namaSem of ['Ganjil', 'Genap']) {
      // Aktifkan semester yang sama dengan yang aktif di produksi
      const isActive = (tp.tahun === activeTahun && namaSem === activeNama);
      
      // Untuk TP 2026/2027, hanya buat Ganjil jika genap belum ada di produksi
      const existsInProd = semProd.some(s => s.TahunPelajaran.tahun === tp.tahun && s.nama_semester === namaSem);
      if (!existsInProd) {
        console.log(`   ⚠️  Skip "${namaSem}" TP "${tp.tahun}" (tidak ada di produksi)`);
        continue;
      }

      try {
        const sem = await prisma.semester.create({
          data: {
            id: randomUUID(),
            tenant_id: DEMO_TENANT_ID,
            nama_semester: namaSem,
            tahun_pelajaran_id: tp.id,
            is_active: isActive,
          }
        });
        created++;
        console.log(`   ✅ ${isActive ? '🟢 AKTIF' : '       '} "${sem.nama_semester}" TP "${tp.tahun}" -> ${sem.id}`);
      } catch (e: any) {
        console.log(`   ❌ Gagal: "${namaSem}" TP "${tp.tahun}" -> ${e.message?.slice(0, 80)}`);
      }
    }
  }

  console.log(`\n📊 ${created} semester dibuat`);

  // Verifikasi final
  const final = await prisma.semester.findMany({
    where: { tenant_id: DEMO_TENANT_ID },
    include: { TahunPelajaran: true },
    orderBy: [{ TahunPelajaran: { tahun: 'asc' } }, { nama_semester: 'asc' }]
  });
  console.log(`\n📋 Semester Tenant Demo (${final.length}):`);
  for (const s of final) {
    console.log(`   ${s.is_active ? '🟢 AKTIF' : '⚪      '} "${s.nama_semester}" | TP: "${s.TahunPelajaran.tahun}" | ${s.id}`);
  }

  console.log(`\n🎉 SELESAI!`);
}

resetAndSeedSemesters()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
