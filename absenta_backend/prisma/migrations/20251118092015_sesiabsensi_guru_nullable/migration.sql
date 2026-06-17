-- DropForeignKey
ALTER TABLE "SesiAbsensi" DROP CONSTRAINT "SesiAbsensi_guru_id_fkey";

-- AlterTable
ALTER TABLE "SesiAbsensi" ALTER COLUMN "guru_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
