-- Fix idempotency bug: remove created_at from unique constraint
-- Sebelumnya: @@unique([sesi_gerbang_id, siswa_id, arah, created_at]) -- TIDAK EFEKTIF
-- Sesudah:    @@unique([sesi_gerbang_id, siswa_id, arah]) -- 1 siswa, 1 sesi, 1 arah = 1 record

-- Step 1: Hapus unique index lama yang tidak efektif (karena ada created_at)
DROP INDEX IF EXISTS "AbsenGerbangSiswa_sesi_gerbang_id_siswa_id_arah_created_at_key";
DROP INDEX IF EXISTS "AbsenGerbangGuru_sesi_gerbang_id_guru_id_arah_created_at_key";

-- Step 2: Hapus record duplikat, pertahankan yang paling awal (created_at terkecil)
DELETE FROM "AbsenGerbangSiswa"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY sesi_gerbang_id, siswa_id, arah
             ORDER BY created_at ASC
           ) AS rn
    FROM "AbsenGerbangSiswa"
  ) ranked
  WHERE rn > 1
);

DELETE FROM "AbsenGerbangGuru"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY sesi_gerbang_id, guru_id, arah
             ORDER BY created_at ASC
           ) AS rn
    FROM "AbsenGerbangGuru"
  ) ranked
  WHERE rn > 1
);

-- Step 3: Buat unique index baru yang benar
CREATE UNIQUE INDEX "AbsenGerbangSiswa_sesi_gerbang_id_siswa_id_arah_key"
  ON "AbsenGerbangSiswa"(sesi_gerbang_id, siswa_id, arah);

CREATE UNIQUE INDEX "AbsenGerbangGuru_sesi_gerbang_id_guru_id_arah_key"
  ON "AbsenGerbangGuru"(sesi_gerbang_id, guru_id, arah);
