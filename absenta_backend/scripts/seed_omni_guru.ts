/**
 * Seed Omni Guru: Assign 1 guru ke semua kode struktur organisasi (positions)
 * untuk keperluan pengujian UI dashboard secara end-to-end.
 *
 * Run: npx tsx scripts/seed_omni_guru.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n Mencari guru pertama yang ada di database...');

  // Cari guru yang sudah ada beserta user-nya
  const guru = await prisma.guru.findFirst({
    include: {
      User: true,
    },
  });

  if (!guru) throw new Error('Tidak ada data Guru di database. Buat guru terlebih dahulu.');
  if (!guru.User) throw new Error('Guru ditemukan tapi tidak punya User account.');

  console.log(`  Menggunakan guru: ${guru.nama_guru}`);
  console.log(`   User ID : ${guru.user_id}`);
  console.log(`   Guru ID : ${guru.id}`);
  console.log(`   Tenant  : ${guru.tenant_id}`);
  console.log(`   Email   : ${guru.User.email}`);

  // Ambil semua positions (kode struktur organisasi) milik tenant ini
  console.log('\n Mengambil semua Struktur Organisasi (OrganizationalPosition)...');
  const positions = await prisma.organizationalPosition.findMany({
    where: {
      tenant_id: guru.tenant_id,
      is_active: true,
    },
    orderBy: { code: 'asc' },
  });

  if (positions.length === 0) {
    throw new Error('Tidak ada OrganizationalPosition ditemukan untuk tenant ini. Jalankan seeding struktur terlebih dahulu.');
  }

  console.log(`\n  Ditemukan ${positions.length} kode struktur:`);
  positions.forEach(p => console.log(`   - ${p.code} (${p.name}) [scope: ${p.scope_type}]`));

  console.log('\n  Mulai assign Omni Guru ke semua posisi...\n');

  let assigned = 0;
  let skipped = 0;

  for (const position of positions) {
    // Cek apakah sudah ada assignment aktif untuk user ini di position ini
    const existing = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: guru.tenant_id,
        position_id: position.id,
        user_id: guru.user_id,
        is_active: true,
      },
    });

    if (existing) {
      console.log(`  SKIP: ${position.code} (${position.name}) - sudah ter-assign.`);
      skipped++;
      continue;
    }

    // Buat assignment baru - hanya field yang ada di schema
    await prisma.organizationalAssignment.create({
      data: {
        tenant_id: guru.tenant_id,
        position_id: position.id,
        user_id: guru.user_id,
        is_active: true,
        start_date: new Date(),
      },
    });

    console.log(`  OK:   ${position.code} (${position.name}) - berhasil di-assign!`);
    assigned++;
  }

  console.log('\n======================================');
  console.log('OMNI GURU SIAP UNTUK PENGUJIAN!');
  console.log('======================================');
  console.log(`${assigned} posisi baru di-assign, ${skipped} posisi sudah ada.`);
  console.log(`\nKredensial Login:`);
  console.log(`   Email    : ${guru.User.email}`);
  console.log(`   (Gunakan password yang sudah ada untuk akun ini)`);
  console.log('\nBuka browser, login, dan cek Dashboard!');
  console.log('======================================\n');
}

main()
  .catch(e => {
    console.error('\nERROR:', e.message ?? e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
