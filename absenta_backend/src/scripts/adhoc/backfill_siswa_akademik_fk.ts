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

  // 5. Backfill P5NilaiSiswa (Tautkan melalui tahun_pelajaran_id & semester_id pada P5Projek)
  const resP5 = await prisma.$executeRawUnsafe(`
    UPDATE "P5NilaiSiswa" p
    SET "siswa_akademik_id" = sa."id"
    FROM "P5Projek" proj, "SiswaAkademik" sa
    WHERE p."projek_id" = proj."id"
      AND p."siswa_id" = sa."siswa_id"
      AND proj."tahun_pelajaran_id" = sa."tahun_pelajaran_id"
      AND proj."semester_id" = sa."semester_id"
      AND p."siswa_akademik_id" IS NULL;
  `);
  console.log(`✅ Backfill P5NilaiSiswa: ${resP5} baris diperbarui dengan siswa_akademik_id.`);

  // Cek apakah ada sisa P5 yang belum tertaut
  const unlinkedP5 = await prisma.p5NilaiSiswa.findMany({
    where: { siswa_akademik_id: null },
    include: { Siswa: true, Projek: true },
  });

  if (unlinkedP5.length > 0) {
    console.log(`ℹ️ Ditemukan ${unlinkedP5.length} baris P5NilaiSiswa tanpa SiswaAkademik. Membuat snapshot SiswaAkademik...`);
    for (const item of unlinkedP5) {
      if (item.Siswa.kelas_id) {
        const sa = await prisma.siswaAkademik.upsert({
          where: {
            siswa_id_tahun_pelajaran_id_semester_id: {
              siswa_id: item.siswa_id,
              tahun_pelajaran_id: item.Projek.tahun_pelajaran_id,
              semester_id: item.Projek.semester_id,
            },
          },
          create: {
            siswa_id: item.siswa_id,
            kelas_id: item.Siswa.kelas_id,
            tahun_pelajaran_id: item.Projek.tahun_pelajaran_id,
            semester_id: item.Projek.semester_id,
            status: 'AKTIF',
          },
          update: {},
        });
        await prisma.p5NilaiSiswa.update({
          where: { id: item.id },
          data: { siswa_akademik_id: sa.id },
        });
      }
    }
    console.log(`✅ Seluruh sisa baris P5NilaiSiswa berhasil ditautkan.`);
  }

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
