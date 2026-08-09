-- Fix idempotency: AbsenSiswa - hapus created_at dari unique constraint
-- Sebelumnya: @@unique([sesi_id, siswa_akademik_id, created_at]) -- tidak efektif
-- Sesudah:    @@unique([sesi_id, siswa_akademik_id]) -- 1 record per siswa per sesi

DROP INDEX IF EXISTS "AbsenSiswa_sesi_id_siswa_akademik_id_created_at_key";

CREATE UNIQUE INDEX IF NOT EXISTS "AbsenSiswa_sesi_id_siswa_akademik_id_key"
  ON "AbsenSiswa"(sesi_id, siswa_akademik_id);
