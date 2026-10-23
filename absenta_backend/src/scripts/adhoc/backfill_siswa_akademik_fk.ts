import { prisma } from '../../utils/prisma';

async function main() {
  console.log('🚀 Memulai backfill relasi SiswaAkademik ke NilaiSiswa, RaporSiswa, SertifikatUkk, KelulusanSiswa...');

  // 1. Backfill NilaiSiswa
  const resNilai = await prisma.$executeRawUnsafe(`
    UPDATE "NilaiSiswa" n
    SET "siswa_akademik_id" = sa."id"
    FROM "SiswaAkademik" sa
    WHERE n."siswa_id" = sa."siswa_id"
      AND n."tahun_pelajaran_id" = sa."tahun_pelajaran_id"
      AND n."semester_id" = sa."semester_id"
      AND n."siswa_akademik_id" IS NULL;
  `);
  console.log(`✅ Backfill NilaiSiswa: ${resNilai} baris diperbarui dengan siswa_akademik_id.`);

  // 2. Backfill RaporSiswa
  const resRapor = await prisma.$executeRawUnsafe(`
    UPDATE "RaporSiswa" r
    SET "siswa_akademik_id" = sa."id"
    FROM "SiswaAkademik" sa
    WHERE r."siswa_id" = sa."siswa_id"
      AND r."tahun_pelajaran_id" = sa."tahun_pelajaran_id"
      AND r."semester_id" = sa."semester_id"
      AND r."siswa_akademik_id" IS NULL;
  `);
  console.log(`✅ Backfill RaporSiswa: ${resRapor} baris diperbarui dengan siswa_akademik_id.`);

  // 3. Backfill SertifikatUkk (Tautkan ke SiswaAkademik tingkat 12/13 atau aktif siswa)
  const resUkk = await prisma.$executeRawUnsafe(`
    UPDATE "SertifikatUkk" u
    SET "siswa_akademik_id" = sub."id"
    FROM (
      SELECT DISTINCT ON (sa."siswa_id") sa."id", sa."siswa_id"
      FROM "SiswaAkademik" sa
      JOIN "Kelas" k ON k."id" = sa."kelas_id"
      ORDER BY sa."siswa_id", k."tingkat" DESC, sa."created_at" DESC
    ) sub
    WHERE u."siswa_id" = sub."siswa_id"
      AND u."siswa_akademik_id" IS NULL;
  `);
  console.log(`✅ Backfill SertifikatUkk: ${resUkk} baris diperbarui dengan siswa_akademik_id.`);

  // 4. Backfill KelulusanSiswa (Tautkan ke SiswaAkademik tingkat akhir)
  const resSkl = await prisma.$executeRawUnsafe(`
    UPDATE "KelulusanSiswa" skl
    SET "siswa_akademik_id" = sub."id"
    FROM (
      SELECT DISTINCT ON (sa."siswa_id") sa."id", sa."siswa_id"
      FROM "SiswaAkademik" sa
      JOIN "Kelas" k ON k."id" = sa."kelas_id"
      ORDER BY sa."siswa_id", k."tingkat" DESC, sa."created_at" DESC
    ) sub
    WHERE skl."siswa_id" = sub."siswa_id"
      AND skl."siswa_akademik_id" IS NULL;
  `);
  console.log(`✅ Backfill KelulusanSiswa: ${resSkl} baris diperbarui dengan siswa_akademik_id.`);

  console.log('🎉 Seluruh relasi historis SiswaAkademik berhasil direkonsiliasi!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
