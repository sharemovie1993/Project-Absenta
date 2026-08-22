/**
 * Seed semester untuk tenant demo UUID baru
 * Berdasarkan TahunPelajaran yang sudah ada
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function seedSemesters() {
  console.log(`🌱 Seeding Semester untuk Tenant Demo: ${TENANT_ID}`);

  const tps = await prisma.tahunPelajaran.findMany({
    where: { tenant_id: TENANT_ID },
    orderBy: { tahun: 'asc' }
  });

  console.log(`📅 TahunPelajaran tersedia: ${tps.length}`);
  tps.forEach(tp => console.log(`   ${tp.is_active ? '🟢' : '⚪'} ${tp.tahun} (${tp.id})`));

  // Tentukan tahun pelajaran aktif
  const activeTp = tps.find(tp => tp.is_active) || tps[tps.length - 1];
  console.log(`\n🟢 TahunPelajaran aktif: "${activeTp?.tahun}"`);

  // Data semester yang akan di-seed
  const semesterData = [
    // TP 2023/2024
    ...tps.filter(tp => tp.tahun === '2023/2024').flatMap(tp => [
      { nama_semester: 'Ganjil 2023/2024', tahun_pelajaran_id: tp.id, is_active: false },
      { nama_semester: 'Genap 2023/2024', tahun_pelajaran_id: tp.id, is_active: false },
    ]),
    // TP 2024/2025
    ...tps.filter(tp => tp.tahun === '2024/2025').flatMap(tp => [
      { nama_semester: 'Ganjil 2024/2025', tahun_pelajaran_id: tp.id, is_active: false },
      { nama_semester: 'Genap 2024/2025', tahun_pelajaran_id: tp.id, is_active: false },
    ]),
    // TP 2025/2026 (AKTIF)
    ...tps.filter(tp => tp.tahun === '2025/2026').flatMap(tp => [
      { nama_semester: 'Ganjil 2025/2026', tahun_pelajaran_id: tp.id, is_active: false },
      { nama_semester: 'Genap 2025/2026', tahun_pelajaran_id: tp.id, is_active: true }, // AKTIF
    ]),
    // TP 2026/2027
    ...tps.filter(tp => tp.tahun === '2026/2027').flatMap(tp => [
      { nama_semester: 'Ganjil 2026/2027', tahun_pelajaran_id: tp.id, is_active: false },
    ]),
  ];

  console.log(`\n📆 Akan membuat ${semesterData.length} semester...`);

  let created = 0;
  for (const sd of semesterData) {
    const existing = await prisma.semester.findFirst({
      where: { tenant_id: TENANT_ID, nama_semester: sd.nama_semester }
    });
    if (existing) {
      console.log(`   ⚪ Sudah ada: "${sd.nama_semester}"`);
      continue;
    }

    const sem = await prisma.semester.create({
      data: {
        id: randomUUID(),
        tenant_id: TENANT_ID,
        nama_semester: sd.nama_semester,
        tahun_pelajaran_id: sd.tahun_pelajaran_id,
        is_active: sd.is_active,
      }
    });
    created++;
    console.log(`   ✅ ${sd.is_active ? '🟢 AKTIF' : '       '} "${sem.nama_semester}" -> ${sem.id}`);
  }

  console.log(`\n📊 ${created} semester baru dibuat`);

  // Pastikan hanya 1 semester aktif
  const activeSems = await prisma.semester.findMany({ where: { tenant_id: TENANT_ID, is_active: true } });
  console.log(`\n🟢 Semester aktif: ${activeSems.length}`);
  activeSems.forEach(s => console.log(`   "${s.nama_semester}" (${s.id})`));

  // Tampilkan semua
  const allSems = await prisma.semester.findMany({
    where: { tenant_id: TENANT_ID },
    include: { TahunPelajaran: true },
    orderBy: { created_at: 'asc' }
  });
  console.log(`\n📋 Semua Semester Tenant Demo (${allSems.length}):`);
  for (const s of allSems) {
    console.log(`   ${s.is_active ? '🟢' : '⚪'} "${s.nama_semester}" | TP: "${s.TahunPelajaran.tahun}"`);
  }

  console.log(`\n🎉 SELESAI!`);
}

seedSemesters()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
