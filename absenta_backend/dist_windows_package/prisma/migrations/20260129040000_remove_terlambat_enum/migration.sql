-- AlterEnum
BEGIN;
CREATE TYPE "AbsenStatus_new" AS ENUM ('HADIR', 'SAKIT', 'IZIN', 'ALPA', 'DISPEN');
ALTER TYPE "AbsenStatus" RENAME TO "AbsenStatus_old";
ALTER TYPE "AbsenStatus_new" RENAME TO "AbsenStatus";
DROP TYPE "AbsenStatus_old";
COMMIT;
