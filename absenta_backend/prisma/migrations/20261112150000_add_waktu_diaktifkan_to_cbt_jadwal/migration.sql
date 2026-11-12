-- Migration: add waktu_diaktifkan to CbtJadwalUjian
-- Menyimpan timestamp saat pengawas mengaktifkan sesi ujian.
-- Digunakan engine untuk menghitung toleransi keterlambatan dari waktu sesi benar-benar dibuka.

ALTER TABLE "CbtJadwalUjian" ADD COLUMN "waktu_diaktifkan" TIMESTAMPTZ;
