-- AlterTable
ALTER TABLE "AbsenGuru" ADD COLUMN     "is_terlambat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menit_keterlambatan" INTEGER,
ADD COLUMN     "poin_kehadiran" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AbsenSiswa" ADD COLUMN     "is_terlambat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menit_keterlambatan" INTEGER,
ADD COLUMN     "poin_kehadiran" INTEGER NOT NULL DEFAULT 0;
