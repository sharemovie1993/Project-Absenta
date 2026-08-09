-- AlterTable
ALTER TABLE "AbsenGerbangSiswa" ADD COLUMN     "is_terlambat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menit_keterlambatan" INTEGER,
ADD COLUMN     "poin_kehadiran" INTEGER NOT NULL DEFAULT 0;
